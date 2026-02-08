'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useBuilderStore } from '@/store/builder'
import { ExecutorService } from '@/services/executor'
import type { PainSignal } from '@/lib/nervous-system'
import { MessageBubble } from './chat/MessageBubble'
import { ChatInput } from './chat/ChatInput'
import type { ActivityEntry } from './governance/InspectorView'
import { TorbitLogo } from '@/components/ui/TorbitLogo'
import { useE2BContext } from '@/providers/E2BProvider'
import { ActivityLedgerTimeline } from './governance/ActivityLedgerTimeline'
import { useLedger, generateLedgerHash } from '@/store/ledger'
import { useGenerationSound, useFileSound } from '@/lib/audio'
import type { SupervisorReviewResult } from './chat/SupervisorSlidePanel'
import { useGovernanceStore } from '@/store/governance'
import { getSupabase } from '@/lib/supabase/client'
import type { Message, ToolCall, StreamChunk, AgentId } from './chat/types'
import { ChatHistorySkeleton } from '@/components/ui/skeletons'

const InspectorView = dynamic(
  () => import('./governance/InspectorView').then((module) => module.InspectorView),
  { ssr: false }
)
const VerificationDetailDrawer = dynamic(
  () => import('./governance/VerificationDetailDrawer').then((module) => module.VerificationDetailDrawer),
  { ssr: false }
)
const SupervisorSlidePanel = dynamic(
  () => import('./chat/SupervisorSlidePanel').then((module) => module.SupervisorSlidePanel),
  { ssr: false }
)

/**
 * ChatPanel - Single voice interface
 * 
 * UX RULES:
 * - User talks to Torbit. Torbit is accountable.
 * - Agents are invisible infrastructure.
 * - No agent names, no model names, no background activity indicators.
 */
export default function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentTask, setCurrentTask] = useState<string | null>(null)
  const [showInspector, setShowInspector] = useState(false)
  const activities: ActivityEntry[] = []
  const selectedAgent: AgentId = 'architect'
  const [showVerificationDrawer, setShowVerificationDrawer] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  
  // Supervisor slide panel state
  const [showSupervisor, setShowSupervisor] = useState(false)
  const [supervisorLoading, setSupervisorLoading] = useState(false)
  const [supervisorResult, setSupervisorResult] = useState<SupervisorReviewResult | null>(null)
  // Pending verification - waits for serverUrl to trigger supervisor
  const [pendingVerification, setPendingVerification] = useState<{
    originalPrompt: string
    filesCreated: string[]
    componentNames: (string | undefined)[]
    pageNames: string[]
    fileCount: number
  } | null>(null)
  
  const [isMounted, setIsMounted] = useState(false)
  
  const { isBooting, isReady, serverUrl, error, verification } = useE2BContext()
  
  // Sound effects
  const generationSound = useGenerationSound()
  const fileSound = useFileSound()
  
  // Prevent hydration mismatch by only showing client-dependent UI after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Activity Ledger
  const { 
    recordIntent, 
    recordArtifactsGenerated, 
    recordVerificationPassed,
    getPhaseStatus,
  } = useLedger()
  
  const { 
    chatCollapsed, 
    toggleChat, 
    setAgentStatus,
    addFile,
    setIsGenerating,
    projectId,
    prompt,
    files,
    projectType,
    capabilities,
    chatInput,
    setChatInput,
    pendingHealRequest,
    setPendingHealRequest,
  } = useBuilderStore()

  // Parse SSE stream
  const parseSSEStream = useCallback(async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantId: string,
    agentId: AgentId,
    initialContent: string = ''
  ) => {
    const decoder = new TextDecoder()
    let buffer = ''
    // Start with initial content (greeting) so we don't lose it
    let fullContent = initialContent ? initialContent + '\n\n' : ''
    const toolCalls: Map<string, ToolCall> = new Map()
    // Track tool execution promises so we can wait for them before supervisor check
    const toolExecutionPromises: Promise<void>[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        
        try {
          const chunk: StreamChunk = JSON.parse(line.slice(6))
          
          switch (chunk.type) {
            case 'text':
              fullContent += chunk.content || ''
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: fullContent, toolCalls: Array.from(toolCalls.values()) }
                  : m
              ))
              break

            case 'tool-call':
              console.log('[DEBUG] Received tool-call chunk:', JSON.stringify(chunk.toolCall))
              if (chunk.toolCall) {
                // Check if we already have this tool call
                const existing = toolCalls.get(chunk.toolCall.id)
                console.log('[DEBUG] isNewCall:', !existing, 'toolName:', chunk.toolCall.name)
                
                const tc: ToolCall = {
                  id: chunk.toolCall.id,
                  name: chunk.toolCall.name,
                  args: chunk.toolCall.args,
                  status: existing?.status || 'running',
                }
                
                // Only process if this is a new tool call (complete args come from onStepFinish)
                const isNewCall = !existing
                
                toolCalls.set(tc.id, tc)
                
                if (isNewCall) {
                  const taskName = getTaskName(tc.name, tc.args)
                  setCurrentTask(taskName)
                  setAgentStatus(agentId, 'working', taskName)
                }
                
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                    : m
                ))
                
                // Execute tool only for new calls (we now receive complete args from API)
                const isAvailable = ExecutorService.isToolAvailable(tc.name)
                console.log('[DEBUG] Tool execution check:', { isNewCall, isAvailable, toolName: tc.name })
                if (isNewCall && isAvailable) {
                  console.log('[DEBUG] Executing tool:', tc.name, 'with args:', JSON.stringify(tc.args))
                  const executionPromise = ExecutorService.executeTool(tc.name, tc.args).then((result) => {
                    console.log('[DEBUG] Tool result:', tc.name, result.success, result.output?.slice(0, 100))
                    const existingTc = toolCalls.get(tc.id)
                    if (existingTc) {
                      existingTc.status = result.success ? 'complete' : 'error'
                      existingTc.result = { success: result.success, output: result.output, duration: result.duration }
                      toolCalls.set(existingTc.id, existingTc)
                      
                      const shouldAddFile = tc.name === 'createFile' && result.success && tc.args.path && tc.args.content
                      console.log('[DEBUG] File add check:', { 
                        shouldAddFile, 
                        toolName: tc.name, 
                        success: result.success, 
                        hasPath: !!tc.args.path, 
                        hasContent: !!tc.args.content 
                      })
                      if (shouldAddFile) {
                        const path = tc.args.path as string
                        console.log('[DEBUG] Calling addFile with path:', path)
                        addFile({
                          path,
                          name: path.split('/').pop() || 'untitled',
                          content: tc.args.content as string,
                          language: path.split('.').pop() || 'text',
                        })
                        // 🔊 File created sound
                        fileSound.onCreate()
                      } else if (tc.name === 'editFile' && result.success) {
                        // 🔊 File edited sound
                        fileSound.onEdit()
                      }
                      
                      setMessages(prev => prev.map(m => 
                        m.id === assistantId 
                          ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                          : m
                      ))
                    }
                  }).catch((error) => {
                    const existingTc = toolCalls.get(tc.id)
                    if (existingTc) {
                      existingTc.status = 'error'
                      existingTc.result = { success: false, output: error instanceof Error ? error.message : 'Unknown error', duration: 0 }
                      toolCalls.set(existingTc.id, existingTc)
                      setMessages(prev => prev.map(m => 
                        m.id === assistantId 
                          ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                          : m
                      ))
                    }
                  })
                  toolExecutionPromises.push(executionPromise)
                }
              }
              break

            case 'tool-result':
              if (chunk.toolResult) {
                const existing = toolCalls.get(chunk.toolResult.id)
                if (existing) {
                  existing.status = chunk.toolResult.success ? 'complete' : 'error'
                  existing.result = chunk.toolResult
                  toolCalls.set(existing.id, existing)
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId 
                      ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                      : m
                  ))
                }
              }
              break

            case 'usage':
              if (chunk.usage) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, usage: chunk.usage }
                    : m
                ))
              }
              break

            case 'governance':
              // Persist governance from server into the store
              if (chunk.governance) {
                useGovernanceStore.getState().addGovernance({
                  verdict: chunk.governance.verdict as 'approved' | 'approved_with_amendments' | 'rejected' | 'escalate',
                  confidence: 'medium',
                  scope: {
                    intent: chunk.governance.intent,
                    affected_areas: [],
                  },
                  protected_invariants: chunk.governance.invariants.map(inv => ({
                    description: inv.description,
                    scope: inv.scope,
                    severity: inv.severity,
                  })),
                })
              }
              break

            case 'proof':
              if (chunk.proof) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, proofLines: chunk.proof }
                    : m
                ))
              }
              break

            case 'error':
              if (chunk.error) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, error: chunk.error, content: fullContent || '' }
                    : m
                ))
              }
              break
          }
        } catch (parseError) {
          console.error('[DEBUG] SSE parse error:', parseError, 'line:', line)
        }
      }
    }

    // Wait for all tool executions to complete before returning
    // This ensures files are in the store before supervisor check runs
    if (toolExecutionPromises.length > 0) {
      console.log('[DEBUG] Waiting for', toolExecutionPromises.length, 'tool executions to complete')
      await Promise.all(toolExecutionPromises)
      console.log('[DEBUG] All tool executions completed')
    }

    // Compute proof lines from tool results (client-side derivation)
    // Server-sent governance proofs via 'proof' chunks will override these.
    // Also persist any governance data received during this build.
    const allToolCalls = Array.from(toolCalls.values())
    const createFileCalls = allToolCalls.filter(tc => tc.name === 'createFile')
    const editFileCalls = allToolCalls.filter(tc => tc.name === 'editFile')
    const testCalls = allToolCalls.filter(tc => tc.name === 'runTests' || tc.name === 'runE2eCycle')
    
    if (createFileCalls.length > 0 || editFileCalls.length > 0) {
      const proofLines: Array<{ label: string; status: 'verified' | 'warning' | 'failed' }> = []
      
      const successFiles = createFileCalls.filter(tc => tc.status === 'complete')
      const failedFiles = createFileCalls.filter(tc => tc.status === 'error')
      
      if (successFiles.length > 0 && failedFiles.length === 0) {
        proofLines.push({ label: `${successFiles.length} files created successfully`, status: 'verified' })
      } else if (failedFiles.length > 0) {
        proofLines.push({ label: `${failedFiles.length} file(s) failed to create`, status: 'failed' })
      }
      
      if (editFileCalls.length > 0) {
        const successEdits = editFileCalls.filter(tc => tc.status === 'complete')
        if (successEdits.length === editFileCalls.length) {
          proofLines.push({ label: `${successEdits.length} files updated`, status: 'verified' })
        }
      }
      
      if (testCalls.length > 0) {
        const passedTests = testCalls.filter(tc => tc.status === 'complete')
        if (passedTests.length === testCalls.length) {
          proofLines.push({ label: 'All tests passed', status: 'verified' })
        } else {
          proofLines.push({ label: 'Some tests failed', status: 'warning' })
        }
      }
      
      if (proofLines.length > 0) {
        setMessages(prev => prev.map(m => 
          m.id === assistantId 
            ? { ...m, proofLines }
            : m
        ))
      }
    }

    setCurrentTask(null)
    return { content: fullContent, toolCalls: Array.from(toolCalls.values()) }
  }, [setAgentStatus, addFile, fileSound])

  // Generate initial acknowledgment - AI will stream the full response with plan
  const generateGreeting = useCallback((prompt: string): string => {
    const promptLower = prompt.toLowerCase()

    // Detect if this is an iteration/edit request vs new build
    const isIteration = promptLower.includes('add ') ||
                        promptLower.includes('change ') ||
                        promptLower.includes('update ') ||
                        promptLower.includes('fix ') ||
                        promptLower.includes('make it ') ||
                        promptLower.includes('modify ') ||
                        promptLower.includes('remove ')

    if (isIteration) {
      // Even iterations get acknowledgment now
      return ''
    }

    // For new builds, acknowledge briefly (AI will stream the full plan)
    return ''
  }, [])

  const handleSubmitMessage = useCallback(async (messageContent: string, agentId: AgentId, isHealRequest: boolean = false) => {
    if (!messageContent.trim() || isLoading) return

    setIsLoading(true)
    setIsGenerating(true)
    setAgentStatus(agentId, 'thinking', isHealRequest ? 'Analyzing...' : 'Planning...')
    setCurrentTask(isHealRequest ? 'Diagnosing...' : 'Planning architecture...')
    
    // 🔊 Start generation sound
    generationSound.onStart()

    // Create a single streaming message that shows progress immediately
    const assistantId = crypto.randomUUID()
    
    // Initial greeting content - will be updated as streaming progresses
    let initialContent: string
    if (isHealRequest) {
      const errorMatch = messageContent.match(/Error Type:\s*(\w+)/i) || 
                         messageContent.match(/(\w+_ERROR)/i) ||
                         messageContent.match(/Error:\s*(.+?)(?:\n|$)/i)
      const errorType = errorMatch?.[1] || 'issue'
      initialContent = `Detected: ${errorType.toLowerCase().replace(/_/g, ' ')}. Patching...`
    } else {
      initialContent = generateGreeting(messageContent)
    }
    
    // Show message immediately - no delay, instant feedback
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: initialContent,
      agentId,
      toolCalls: [],
    }])

    let requestFailed = false

    try {
      // Load persisted invariants to send as context
      const persistedInvariants = useGovernanceStore.getState().getInvariantsForPrompt()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      const supabase = getSupabase()
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`
        }
      }
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 75000)

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: messageContent }]
            .filter(m => m.content && m.content.trim().length > 0)
            .map(m => ({ role: m.role, content: m.content })),
          agentId,
          projectId: projectId || undefined,
          projectType,
          capabilities,
          persistedInvariants,
        }),
      }).finally(() => clearTimeout(timeoutId))

      if (!response.ok) {
        let serverMessage = ''
        try {
          const payload = await response.json() as { error?: string }
          serverMessage = payload.error || ''
        } catch {
          // Ignore non-JSON body
        }
        const message = serverMessage || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(message)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      await parseSSEStream(reader, assistantId, agentId, initialContent)
      setAgentStatus(agentId, 'complete', 'Done')
      
      // Generate completion summary if this was a build (not a heal request)
      if (!isHealRequest && files.length > 0) {
        // Get file paths for verification
        const filePaths = files.map(f => f.path)
        
        // Get component names
        const componentNames = files
          .filter(f => f.path.includes('/components/'))
          .map(f => f.path.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, ''))
          .filter(Boolean)
          .slice(0, 5) // max 5
        
        // Get page names
        const pageNames = files
          .filter(f => f.path.includes('page.'))
          .map(f => {
            const parts = f.path.split('/')
            const folder = parts[parts.length - 2]
            return folder === 'app' ? 'Home' : folder.charAt(0).toUpperCase() + folder.slice(1)
          })
          .filter((v, i, a) => a.indexOf(v) === i) // unique
        
        // Show message that we're waiting for build, NOT that supervisor is reviewing yet
        setMessages(prev => [...prev, {
          id: `complete-${Date.now()}`,
          role: 'assistant',
          content: `**${files.length} files generated.** Building preview...`,
          agentId,
          toolCalls: [],
        }])
        
        // Store pending verification data - supervisor will run when serverUrl is available
        setPendingVerification({
          originalPrompt: prompt || messages.find(m => m.role === 'user')?.content || '',
          filesCreated: filePaths,
          componentNames,
          pageNames,
          fileCount: files.length,
        })
      }
    } catch (error) {
      requestFailed = true
      setAgentStatus(agentId, 'error', 'Failed')
      // 🔊 Error sound
      generationSound.onError()
      const errorMessage = error instanceof Error && error.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : (error instanceof Error ? error.message : 'Unknown error')
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: '', error: { type: 'network', message: errorMessage, retryable: true }}
          : m
      ))
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
      setCurrentTask(null)
      // 🔊 Complete sound (if not error)
      if (!requestFailed) generationSound.onComplete()
    }
  }, [isLoading, messages, setIsGenerating, setAgentStatus, parseSSEStream, projectId, projectType, capabilities, files, generationSound, generateGreeting, prompt])

  // Auto-submit initial prompt
  useEffect(() => {
    if (prompt && messages.length === 0) {
      setMessages([{ id: 'init', role: 'user', content: prompt }])
      handleSubmitMessage(prompt, selectedAgent)
    }
  }, [prompt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ============================================================================
  // AUTO-HEAL: Watch for pending heal requests from Nervous System
  // ============================================================================
  
  // Track consecutive heal failures for escalation
  const healAttemptCountRef = useRef(0)
  const MAX_HEAL_ATTEMPTS = 2 // After 2 failed attempts, escalate with more context
  
  useEffect(() => {
    if (!pendingHealRequest || isLoading) return
    
    console.log('🔧 Processing heal request:', pendingHealRequest)
    
    // Clear the pending request immediately to prevent loops
    setPendingHealRequest(null)
    
    // Increment heal attempt counter
    healAttemptCountRef.current += 1
    const attemptNum = healAttemptCountRef.current
    
    // After 2 failed attempts, call supervisor
    if (attemptNum > MAX_HEAL_ATTEMPTS) {
      // Show message that we're escalating to supervisor
      setMessages(prev => [...prev, { 
        id: `escalate-${Date.now()}`, 
        role: 'assistant',
        content: `I've tried ${MAX_HEAL_ATTEMPTS} times but the issue persists. Let me call in the supervisor for a deeper review...`,
        agentId: selectedAgent,
        toolCalls: [],
      }])
      
      // Open supervisor panel
      setShowSupervisor(true)
      setSupervisorLoading(true)
      
      // Call supervisor with the error context
      setTimeout(async () => {
        try {
          const headers: HeadersInit = { 'Content-Type': 'application/json' }
          const supabase = getSupabase()
          if (supabase) {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
              headers.Authorization = `Bearer ${session.access_token}`
            }
          }

          const verifyResponse = await fetch('/api/verify', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              originalPrompt: `FIX REQUIRED: ${pendingHealRequest.error}\n\nSuggestion: ${pendingHealRequest.suggestion}`,
              filesCreated: files.map(f => f.path),
              componentNames: [],
              pageNames: [],
              fileCount: files.length,
            }),
          })
          
          if (verifyResponse.ok) {
            const result = await verifyResponse.json() as SupervisorReviewResult
            setSupervisorLoading(false)
            // Force NEEDS_FIXES with the error as a fix item
            setSupervisorResult({
              status: 'NEEDS_FIXES',
              summary: `Build error after ${MAX_HEAL_ATTEMPTS} attempts: ${pendingHealRequest.error}`,
              fixes: result.fixes.length > 0 ? result.fixes : [{
                id: 'error-fix-1',
                feature: 'Fix build error',
                description: pendingHealRequest.suggestion,
                severity: 'critical',
                status: 'pending',
              }],
            })
          } else {
            setSupervisorLoading(false)
            setSupervisorResult({
              status: 'NEEDS_FIXES',
              summary: `Build error: ${pendingHealRequest.error}`,
              fixes: [{
                id: 'error-fix-1',
                feature: 'Fix build error',
                description: pendingHealRequest.suggestion,
                severity: 'critical',
                status: 'pending',
              }],
            })
          }
        } catch (err) {
          console.error('Supervisor call failed:', err)
          setSupervisorLoading(false)
          setShowSupervisor(false)
        }
      }, 300)
      
      return // Don't continue with normal heal flow
    }
    
    const targetAgent: AgentId = 'architect' // Always use architect - only agent that can edit
    
    // Create the heal message
    const healPrompt = `🔧 BUILD ERROR (Attempt ${attemptNum}/${MAX_HEAL_ATTEMPTS}) - Fix needed:

**Error Type:** ${pendingHealRequest.error.split(':')[0] || 'Unknown'}
**Details:** ${pendingHealRequest.error}
**Suggested Fix:** ${pendingHealRequest.suggestion}

Analyze the error, identify the problematic file, and use editFile to fix it immediately.`
    
    // Add as user message and trigger AI
    setMessages(prev => [...prev, { 
      id: `heal-${Date.now()}`, 
      role: 'user', 
      content: healPrompt 
    }])
    
    handleSubmitMessage(healPrompt, targetAgent, true) // Pass true for isHealRequest
  }, [pendingHealRequest, isLoading, setPendingHealRequest, handleSubmitMessage, files, selectedAgent])
  
  // Reset heal counter when build succeeds (serverUrl becomes available)
  useEffect(() => {
    if (serverUrl) {
      healAttemptCountRef.current = 0
    }
  }, [serverUrl])

  // Auto-apply fixes from supervisor (called automatically, no button needed)
  const autoApplyFixes = useCallback((result: SupervisorReviewResult) => {
    if (!result || result.fixes.length === 0) return
    
    // Mark all fixes as "fixing"
    setSupervisorResult(prev => prev ? {
      ...prev,
      fixes: prev.fixes.map(f => ({ ...f, status: 'fixing' as const }))
    } : null)
    
    // Build the fix prompt
    const criticalFixes = result.fixes.filter(f => f.severity === 'critical')
    const recommendedFixes = result.fixes.filter(f => f.severity === 'recommended')
    
    const fixPrompt = `Supervisor review found issues. Fix these:

${criticalFixes.map((f, i) => `${i + 1}. **${f.feature}**: ${f.description}`).join('\n')}
${recommendedFixes.length > 0 ? `\nAlso add:\n${recommendedFixes.map((f, i) => `${criticalFixes.length + i + 1}. ${f.feature}: ${f.description}`).join('\n')}` : ''}

Implement these fixes in the existing codebase. Use editFile for existing files, createFile only for new files.`

    // Show the supervisor's request in chat so user can see what's being fixed
    setMessages(prev => [...prev, {
      id: `supervisor-request-${Date.now()}`,
      role: 'user',
      content: `**Supervisor Request:**\n\n${criticalFixes.map((f, i) => `${i + 1}. **${f.feature}**: ${f.description}`).join('\n')}${recommendedFixes.length > 0 ? `\n\n**Also recommended:**\n${recommendedFixes.map((f) => `• ${f.feature}: ${f.description}`).join('\n')}` : ''}`,
      agentId: selectedAgent,
    }])
    
    // Mark fixes as complete after a delay (visual progress)
    const updateFixStatus = (index: number) => {
      setTimeout(() => {
        setSupervisorResult(prev => {
          if (!prev) return null
          const newFixes = [...prev.fixes]
          if (newFixes[index]) {
            newFixes[index] = { ...newFixes[index], status: 'complete' }
          }
          // Auto-close panel when all fixes are complete
          const allComplete = newFixes.every(f => f.status === 'complete')
          if (allComplete) {
            setTimeout(() => setShowSupervisor(false), 1000)
          }
          return { ...prev, fixes: newFixes }
        })
        if (index < (result?.fixes.length || 0) - 1) {
          updateFixStatus(index + 1)
        }
      }, 1500 + (index * 800)) // Stagger the visual updates
    }
    updateFixStatus(0)
    
    // Submit the fix request - isHealRequest=true skips another review
    handleSubmitMessage(fixPrompt, selectedAgent, true)
  }, [selectedAgent, handleSubmitMessage])

  // Trigger supervisor verification when serverUrl becomes available AND we have pending verification
  // This ensures supervisor only approves after the build actually succeeds
  useEffect(() => {
    if (!serverUrl || !pendingVerification) return
    
    // Update message to show supervisor is now reviewing (build succeeded)
    setMessages(prev => prev.map(m =>
      m.content?.includes('Building preview')
        ? { ...m, content: `**${pendingVerification.fileCount} files generated.** Supervisor is reviewing...` }
        : m
    ))
    
    // Open supervisor panel and call verification API
    setShowSupervisor(true)
    setSupervisorLoading(true)
    setSupervisorResult(null)
    
    const runVerification = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        const supabase = getSupabase()
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`
          }
        }

        const verifyResponse = await fetch('/api/verify', {
          method: 'POST',
          headers,
          body: JSON.stringify(pendingVerification),
        })
        
        if (verifyResponse.ok) {
          const result = await verifyResponse.json() as SupervisorReviewResult
          setSupervisorLoading(false)
          setSupervisorResult(result)
          
          if (result.status === 'APPROVED') {
            // Build message with optional suggestions
            let approvedMessage = `**${pendingVerification.fileCount} files generated.**\n\n✓ **Supervisor approved** — Build meets quality standards.`
            
            if (result.suggestions && result.suggestions.length > 0) {
              approvedMessage += `\n\n**Suggestions for improvement:**\n`
              approvedMessage += result.suggestions
                .map((s, i) => `${i + 1}. **${s.idea}** (${s.effort}) — ${s.description}`)
                .join('\n')
            }
            
            approvedMessage += `\n\nPreview is live. What would you like to iterate on?`
            
            setMessages(prev => prev.map(m =>
              m.content?.includes('Supervisor is reviewing')
                ? { ...m, content: approvedMessage }
                : m
            ))
            setTimeout(() => setShowSupervisor(false), 2000)
          } else {
            // NEEDS_FIXES - Show what Supervisor found
            const issueList = result.fixes
              .map((f, i) => `${i + 1}. **${f.feature}**: ${f.description}`)
              .join('\n')

            setMessages(prev => prev.map(m =>
              m.content?.includes('Supervisor is reviewing')
                ? { ...m, content: `**${pendingVerification.fileCount} files generated.** Supervisor review:\n\n**Issues found:**\n${issueList}\n\nApplying fixes...` }
                : m
            ))
            setTimeout(() => {
              autoApplyFixes(result)
            }, 2000)
          }
        } else {
          // Verification API failed - just approve since build succeeded
          setSupervisorLoading(false)
          setSupervisorResult({ status: 'APPROVED', summary: 'Build complete', fixes: [] })
          setShowSupervisor(false)
          setMessages(prev => prev.map(m => 
            m.content?.includes('Supervisor is reviewing')
              ? { ...m, content: `**${pendingVerification.fileCount} files generated.** Preview is live.\n\nWhat would you like to iterate on?` }
              : m
          ))
        }
      } catch (err) {
        console.error('Supervisor verification failed:', err)
        setSupervisorLoading(false)
        setShowSupervisor(false)
        setMessages(prev => prev.map(m => 
          m.content?.includes('Supervisor is reviewing')
            ? { ...m, content: `**${pendingVerification.fileCount} files generated.** Preview is live.\n\nWhat would you like to iterate on?` }
            : m
        ))
      } finally {
        // Clear pending verification
        setPendingVerification(null)
      }
    }
    
    runVerification()
  }, [serverUrl, pendingVerification, autoApplyFixes])

  // ============================================================================
  // Activity Ledger Recording
  // ============================================================================
  
  // Record intent when user submits first message
  useEffect(() => {
    if (messages.length > 0 && getPhaseStatus('describe') === 'pending') {
      const userMessage = messages.find(m => m.role === 'user')
      if (userMessage?.content) {
        recordIntent(generateLedgerHash(userMessage.content))
      }
    }
  }, [messages, getPhaseStatus, recordIntent])
  
  // Record artifacts generated when files are added
  useEffect(() => {
    if (files.length > 0 && getPhaseStatus('build') === 'pending' && !isLoading) {
      recordArtifactsGenerated(
        files.length,
        files.map(f => f.path)
      )
    }
  }, [files, getPhaseStatus, isLoading, recordArtifactsGenerated])
  
  // Record verification passed when server is ready
  useEffect(() => {
    if (serverUrl && verification.sandboxId && verification.lockfileHash && getPhaseStatus('verify') === 'pending') {
      recordVerificationPassed(
        verification.sandboxId,
        verification.lockfileHash
      )
    }
  }, [serverUrl, verification, getPhaseStatus, recordVerificationPassed])

  // Auto-fix errors
  useEffect(() => {
    // DISABLED: Duplicate auto-heal path removed - using Zustand pendingHealRequest instead
    // The pendingHealRequest flow in WebContainerProvider → ChatPanel is cleaner
    const handlePain = (e: CustomEvent<PainSignal>) => {
      // Log for debugging but don't trigger duplicate heal
      console.log('🔔 Pain signal received (handled via pendingHealRequest):', e.detail.type)
    }

    window.addEventListener('torbit-pain-signal', handlePain as EventListener)
    return () => window.removeEventListener('torbit-pain-signal', handlePain as EventListener)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: chatInput }])
    handleSubmitMessage(chatInput, selectedAgent)
    setChatInput('')
  }

  function getTaskName(toolName: string, args: Record<string, unknown>): string {
    if (toolName === 'createFile' && args.path) {
      return (args.path as string).split('/').pop() || 'file'
    }
    if (toolName === 'think') return 'Reasoning'
    if (toolName === 'verifyDependencyGraph') return 'verify Dependency Graph'
    return toolName.replace(/([A-Z])/g, ' $1').trim()
  }

  useEffect(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant' && message.content?.trim().length)

    if (!latestAssistant?.content) {
      if (!isLoading) setLiveMessage('')
      return
    }

    const snippet = latestAssistant.content.replace(/\s+/g, ' ').trim().slice(-180)
    setLiveMessage(isLoading ? `Torbit is responding: ${snippet}` : `Torbit said: ${snippet}`)
  }, [messages, isLoading])

  return (
    <motion.div
      className="h-full bg-[#000000] border-r border-[#151515] flex flex-col"
      animate={{ width: chatCollapsed ? 48 : 440 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
      <div className="sr-only" aria-live="polite" aria-atomic="false">
        {liveMessage}
      </div>

      {/* Header - Torbit branding */}
      <div className="h-11 border-b border-[#151515] flex items-center justify-between px-4 shrink-0">
        <AnimatePresence mode="wait">
          {!chatCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-neutral-400 to-neutral-600" />
              <span className="text-[13px] font-medium text-[#c0c0c0]">
                Torbit
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={toggleChat}
          className="w-6 h-6 flex items-center justify-center text-[#505050] hover:text-[#a8a8a8] hover:bg-[#0a0a0a] rounded transition-all"
        >
          <svg 
            className={`w-3.5 h-3.5 transition-transform ${chatCollapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <AnimatePresence mode="wait">
        {!chatCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto custom-scrollbar"
          >
            {messages.length === 0 ? (
              isLoading ? (
                <ChatHistorySkeleton />
              ) : (
                <EmptyState onSelectTemplate={(templatePrompt) => {
                  setChatInput(templatePrompt)
                }} />
              )
            ) : (
              <div className="p-4 space-y-0">
                {messages.map((message, i) => (
                  <MessageBubble 
                    key={message.id}
                    message={message}
                    isLast={i === messages.length - 1}
                    isLoading={isLoading}
                    index={i}
                  />
                ))}
                {isLoading && <ChatHistorySkeleton rows={1} />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Execution Status Rail - The authoritative spine */}
      <AnimatePresence mode="wait">
        {isMounted && !chatCollapsed && (isLoading || isBooting || (messages.length > 0 && files.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-t border-[#151515] bg-[#000000]"
          >
            <ExecutionStatusRail 
              isBooting={isBooting}
              isReady={isReady}
              serverUrl={serverUrl}
              error={error}
              isBuilding={isLoading}
              currentTask={currentTask}
              hasFiles={files.length > 0}
              onOpenVerification={() => setShowVerificationDrawer(true)}
            />
            
            {/* Activity Ledger Timeline - Below status rail, above input */}
            <ActivityLedgerTimeline className="mt-2 pt-2 border-t border-[#101010]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <AnimatePresence mode="wait">
        {!chatCollapsed && (
          <ChatInput
            input={chatInput}
            isLoading={isLoading}
            onInputChange={setChatInput}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>
      
      {/* Inspector View - Opt-in timeline for advanced users */}
      <InspectorView 
        activities={activities}
        isOpen={showInspector}
        onClose={() => setShowInspector(false)}
      />
      
      {/* Verification Detail Drawer - Read-only proof surface */}
      <VerificationDetailDrawer
        isOpen={showVerificationDrawer}
        onClose={() => setShowVerificationDrawer(false)}
        data={{
          environmentVerifiedAt: verification.environmentVerifiedAt,
          runtimeVersion: verification.runtimeVersion,
          sandboxId: verification.sandboxId,
          dependenciesLockedAt: verification.dependenciesLockedAt,
          dependencyCount: verification.dependencyCount,
          lockfileHash: verification.lockfileHash,
          buildCompletedAt: files.length > 0 ? Date.now() : null,
          artifactCount: files.length,
          auditorVerdict: isReady && serverUrl ? 'passed' : 'pending',
          auditorTimestamp: isReady && serverUrl ? Date.now() : null,
        }}
      />
      
      {/* Supervisor Slide Panel - Reviews build and auto-fixes issues */}
      <SupervisorSlidePanel
        isOpen={showSupervisor}
        isLoading={supervisorLoading}
        result={supervisorResult}
        onDismiss={() => setShowSupervisor(false)}
      />
    </motion.div>
  )
}

const PRODUCTION_STARTERS = [
  { 
    label: 'Internal Tool', 
    description: 'Auth, roles, audit logs, governed integrations',
    prompt: 'Build a production-ready internal tool with user authentication, role-based access control, audit logging, and secure API integrations. Include a dashboard layout with sidebar navigation.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    )
  },
  { 
    label: 'Customer-Facing App', 
    description: 'Auth, billing, export-ready frontend',
    prompt: 'Build a production-ready customer-facing SaaS application with user authentication, Stripe billing integration, and a polished export-ready frontend. Include onboarding flow and account settings.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    )
  },
  { 
    label: 'API / Backend Service', 
    description: 'Validated routes, schema, observability',
    prompt: 'Build a production-ready API backend service with validated REST routes, TypeScript schema definitions, error handling, and observability endpoints. Include health checks and structured logging.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    )
  },
  { 
    label: 'Mobile App', 
    description: 'iOS export, permissions, App Store bundle',
    prompt: 'Build a production-ready mobile application with React Native / Expo setup, proper permission handling, iOS export configuration, and App Store submission bundle structure.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    )
  },
]

function EmptyState({ onSelectTemplate }: { onSelectTemplate?: (prompt: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-[380px]">
        {/* TORBIT Logo */}
        <div className="w-10 h-10 mx-auto mb-5 flex items-center justify-center">
          <TorbitLogo size="lg" variant="muted" animated />
        </div>
        
        <h3 className="text-[15px] font-medium text-white/90 mb-1.5">Start with a production artifact</h3>
        <p className="text-[12px] text-white/40 mb-6">
          Choose a governed starting point. Torbit will handle the rest.
        </p>
        
        {/* Production Starters - Vertical layout */}
        <div className="space-y-2">
          {PRODUCTION_STARTERS.map((starter) => (
            <button
              key={starter.label}
              onClick={() => onSelectTemplate?.(starter.prompt)}
              className="w-full flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-l-white/40 hover:border-l-2 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/30 group-hover:text-white/50 group-hover:border-white/[0.15] transition-all flex-shrink-0 mt-0.5">
                {starter.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-white/70 group-hover:text-white/90 transition-colors mb-0.5">
                  {starter.label}
                </div>
                <div className="text-[11px] text-white/30 group-hover:text-white/40 transition-colors">
                  {starter.description}
                </div>
              </div>
              <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Execution Status Rail - The Authoritative Spine
// ============================================================================
// Replaces terminal as primary feedback. Deterministic. Human-readable.
// Events are summarized. Logs are hidden behind this.
// ============================================================================

interface ExecutionStatusRailProps {
  isBooting: boolean
  isReady: boolean
  serverUrl: string | null
  error: string | null
  isBuilding: boolean
  currentTask: string | null
  hasFiles: boolean
  onOpenVerification?: () => void
}

function ExecutionStatusRail({
  isBooting,
  isReady,
  serverUrl,
  error,
  isBuilding,
  currentTask,
  hasFiles,
  onOpenVerification,
}: ExecutionStatusRailProps) {
  // Derive status steps with error awareness
  const hasError = !!error
  
  // Determine if we're fully complete (has files, not building, no errors, preview running)
  const isFullyComplete = hasFiles && !isBuilding && !hasError && serverUrl
  
  const steps: Array<{
    label: string
    status: 'complete' | 'active' | 'pending' | 'error' | 'verified'
    errorMessage?: string
    recoveryAction?: string
  }> = [
    {
      label: 'Environment verified',
      status: hasError && !isReady ? 'error' : isReady ? 'complete' : isBooting ? 'active' : 'pending',
      errorMessage: hasError && !isReady ? 'Environment verification failed' : undefined,
      recoveryAction: hasError && !isReady ? 'Retry verification' : undefined,
    },
    {
      label: 'Toolchain locked',
      status: hasError && !isReady ? 'error' : isReady ? 'complete' : 'pending',
    },
    {
      label: 'Dependencies pinned',
      status: hasError ? 'error' : serverUrl ? 'complete' : isReady && !serverUrl ? 'active' : 'pending',
      errorMessage: hasError && isReady && !serverUrl ? 'Dependency resolution failed' : undefined,
      recoveryAction: hasError && isReady && !serverUrl ? 'Resolve dependencies' : undefined,
    },
    {
      label: isBuilding ? (currentTask && currentTask !== 'Thinking...' ? currentTask : 'Building artifacts') : (hasFiles ? 'Artifacts ready' : 'Awaiting build'),
      status: hasError && isReady && serverUrl ? 'error' : isBuilding ? 'active' : hasFiles ? 'complete' : 'pending',
      errorMessage: hasError && isReady && serverUrl ? 'Build failed' : undefined,
      recoveryAction: hasError && isReady && serverUrl ? 'Retry build' : undefined,
    },
    {
      label: isFullyComplete ? 'Build verified' : (isBuilding ? 'Verification pending' : 'Awaiting verification'),
      status: isFullyComplete ? 'verified' : 'pending',
    },
  ]

  // Only show relevant steps (hide pending ones after active)
  const activeIndex = steps.findIndex(s => s.status === 'active')
  const errorIndex = steps.findIndex(s => s.status === 'error')
  const verifiedIndex = steps.findIndex(s => s.status === 'verified')
  
  let visibleSteps: typeof steps
  
  if (errorIndex >= 0) {
    // Show up to and including the error
    visibleSteps = steps.slice(0, errorIndex + 1)
  } else if (verifiedIndex >= 0) {
    // Show all steps when verified - user sees full completion
    visibleSteps = steps
  } else if (activeIndex >= 0) {
    visibleSteps = steps.slice(0, Math.min(activeIndex + 2, steps.length))
  } else {
    visibleSteps = steps.filter(s => s.status === 'complete' || s.status === 'verified').slice(-3)
  }

  if (visibleSteps.length === 0) return null

  // Find the error step if any
  const errorStep = visibleSteps.find(s => s.status === 'error')

  return (
    <div className="space-y-1.5">
      {visibleSteps.map((step, i) => {
        const isClickable = (step.status === 'complete' || step.status === 'verified') && onOpenVerification
        
        const content = (
          <>
            {step.status === 'complete' && (
              <svg className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {step.status === 'verified' && (
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            )}
            {step.status === 'active' && (
              <motion.div
                className="w-3 h-3 rounded-full border border-white/30 border-t-white/60"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            )}
            {step.status === 'pending' && (
              <div className="w-3 h-3 rounded-full border border-white/10" />
            )}
            {step.status === 'error' && (
              <svg className="w-3 h-3 text-red-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`text-[11px] ${
              step.status === 'complete' ? 'text-white/40 group-hover:text-white/60' :
              step.status === 'verified' ? 'text-emerald-400 font-medium' :
              step.status === 'active' ? 'text-white/60' :
              step.status === 'error' ? 'text-red-400/70' :
              'text-white/20'
            } transition-colors`}>
              {step.status === 'error' && step.errorMessage ? step.errorMessage : step.label}
            </span>
          </>
        )
        
        return isClickable ? (
          <button
            key={i}
            onClick={onOpenVerification}
            className="flex items-center gap-2 group cursor-pointer hover:bg-white/[0.02] -mx-1 px-1 py-0.5 rounded transition-colors"
          >
            {content}
          </button>
        ) : (
          <div key={i} className="flex items-center gap-2">
            {content}
          </div>
        )
      })}
      
      {/* Single recovery action for errors */}
      {errorStep?.recoveryAction && (
        <button 
          className="mt-2 text-[11px] text-white/50 hover:text-white/70 transition-colors flex items-center gap-1.5 pl-5"
          onClick={() => window.location.reload()}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {errorStep.recoveryAction}
        </button>
      )}
    </div>
  )
}
