'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'
import { ExecutorService } from '@/services/executor'
import { NervousSystem, type PainSignal } from '@/lib/nervous-system'
import { MessageBubble } from './chat/MessageBubble'
import { ChatInput } from './chat/ChatInput'
import { InspectorView, type ActivityEntry } from './governance'
import { TorbitLogo } from '@/components/ui/TorbitLogo'
import { useWebContainerContext } from '@/providers/WebContainerProvider'
import { VerificationDetailDrawer, type VerificationData } from './governance/VerificationDetailDrawer'
import { ActivityLedgerTimeline } from './governance/ActivityLedgerTimeline'
import { useLedger, generateLedgerHash } from '@/store/ledger'
import type { Message, ToolCall, StreamChunk, AgentId } from './chat/types'

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
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [selectedAgent] = useState<AgentId>('architect')
  const [showVerificationDrawer, setShowVerificationDrawer] = useState(false)
  
  const { isBooting, isReady, serverUrl, error, verification } = useWebContainerContext()
  
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
    prompt,
    files,
    projectType,
    capabilities,
    chatInput,
    setChatInput,
  } = useBuilderStore()

  // Parse SSE stream
  const parseSSEStream = useCallback(async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantId: string,
    agentId: AgentId
  ) => {
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''
    const toolCalls: Map<string, ToolCall> = new Map()

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
              if (chunk.toolCall) {
                const tc: ToolCall = {
                  id: chunk.toolCall.id,
                  name: chunk.toolCall.name,
                  args: chunk.toolCall.args,
                  status: 'running',
                }
                toolCalls.set(tc.id, tc)
                
                const taskName = getTaskName(tc.name, tc.args)
                setCurrentTask(taskName)
                setAgentStatus(agentId, 'working', taskName)
                
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                    : m
                ))
                
                // Execute tool
                if (ExecutorService.isToolAvailable(tc.name)) {
                  ExecutorService.executeTool(tc.name, tc.args).then((result) => {
                    const existingTc = toolCalls.get(tc.id)
                    if (existingTc) {
                      existingTc.status = result.success ? 'complete' : 'error'
                      existingTc.result = { success: result.success, output: result.output, duration: result.duration }
                      toolCalls.set(existingTc.id, existingTc)
                      
                      if (tc.name === 'createFile' && result.success && tc.args.path && tc.args.content) {
                        const path = tc.args.path as string
                        addFile({
                          path,
                          name: path.split('/').pop() || 'untitled',
                          content: tc.args.content as string,
                          language: path.split('.').pop() || 'text',
                        })
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
        } catch {
          // Ignore parse errors
        }
      }
    }

    setCurrentTask(null)
    return { content: fullContent, toolCalls: Array.from(toolCalls.values()) }
  }, [setAgentStatus, addFile])

  const handleSubmitMessage = useCallback(async (messageContent: string, agentId: AgentId) => {
    if (!messageContent.trim() || isLoading) return

    setIsLoading(true)
    setIsGenerating(true)
    setAgentStatus(agentId, 'thinking', 'Thinking...')
    setCurrentTask('Thinking...')

    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      agentId,
      toolCalls: [],
    }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: messageContent }]
            .filter(m => m.content && m.content.trim().length > 0)
            .map(m => ({ role: m.role, content: m.content })),
          agentId,
          projectType,
          capabilities,
        }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      await parseSSEStream(reader, assistantId, agentId)
      setAgentStatus(agentId, 'complete', 'Done')
    } catch (error) {
      setAgentStatus(agentId, 'error', 'Failed')
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: '', error: { type: 'network', message: error instanceof Error ? error.message : 'Unknown error', retryable: true }}
          : m
      ))
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
      setCurrentTask(null)
    }
  }, [isLoading, messages, setIsGenerating, setAgentStatus, parseSSEStream, projectType, capabilities])

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
    if (serverUrl && verification.containerHash && verification.lockfileHash && getPhaseStatus('verify') === 'pending') {
      recordVerificationPassed(
        verification.containerHash,
        verification.lockfileHash
      )
    }
  }, [serverUrl, verification, getPhaseStatus, recordVerificationPassed])

  // Auto-fix errors
  useEffect(() => {
    const handlePain = (e: CustomEvent<PainSignal>) => {
      const signal = e.detail
      if (signal.severity !== 'critical') return
      
      const lastAutoFix = (window as unknown as { __lastAutoFix?: number }).__lastAutoFix || 0
      if (Date.now() - lastAutoFix < 5000) return
      (window as unknown as { __lastAutoFix: number }).__lastAutoFix = Date.now()
      
      const errorMessage = NervousSystem.formatForAI(signal)
      setMessages(prev => [...prev, { id: `pain-${signal.id}`, role: 'user', content: errorMessage }])
      setAgentStatus(selectedAgent, 'working', 'Auto-fixing...')
      handleSubmitMessage(errorMessage, selectedAgent)
    }

    window.addEventListener('torbit-pain-signal', handlePain as EventListener)
    return () => window.removeEventListener('torbit-pain-signal', handlePain as EventListener)
  }, [selectedAgent, handleSubmitMessage, setAgentStatus])

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

  return (
    <motion.div
      className="h-full bg-[#000000] border-r border-[#151515] flex flex-col"
      animate={{ width: chatCollapsed ? 48 : 440 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
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
              <EmptyState onSelectTemplate={(prompt) => {
                setChatInput(prompt)
              }} />
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
                <div ref={messagesEndRef} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Execution Status Rail - The authoritative spine */}
      <AnimatePresence mode="wait">
        {!chatCollapsed && (isLoading || isBooting || (messages.length > 0 && files.length > 0)) && (
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
      
      {/* Bottom Action Bar - Emergent style */}
      <AnimatePresence mode="wait">
        {!chatCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-11 border-t border-[#151515] flex items-center justify-between px-3 bg-[#000000] shrink-0"
          >
            {/* Left: View activity (opt-in Inspector) */}
            <button 
              onClick={() => setShowInspector(true)}
              className="h-7 px-2 flex items-center gap-1.5 text-[10px] text-[#404040] hover:text-[#606060] transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View activity
            </button>
            
            {/* Center: Actions */}
            <div className="flex items-center gap-1">
              <button className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] text-[#505050] hover:text-[#a8a8a8] hover:bg-[#0a0a0a] rounded-lg transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
                </svg>
                GitHub
              </button>
              
              {/* Ultra toggle */}
              <button className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] text-[#505050] hover:text-[#a8a8a8] hover:bg-[#0a0a0a] rounded-lg transition-all">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-[#808080] to-[#c0c0c0] opacity-50" />
                Ultra
              </button>
            </div>
            
            {/* Right: Mic / Stop */}
            <div className="flex items-center gap-1">
              {isLoading ? (
                <button 
                  onClick={() => setIsLoading(false)}
                  className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                </button>
              ) : (
                <button className="w-7 h-7 flex items-center justify-center text-[#505050] hover:text-[#a8a8a8] hover:bg-[#0a0a0a] rounded-lg transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
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
          containerHash: verification.containerHash,
          dependenciesLockedAt: verification.dependenciesLockedAt,
          dependencyCount: verification.dependencyCount,
          lockfileHash: verification.lockfileHash,
          buildCompletedAt: files.length > 0 ? Date.now() : null,
          artifactCount: files.length,
          auditorVerdict: isReady && serverUrl ? 'passed' : 'pending',
          auditorTimestamp: isReady && serverUrl ? Date.now() : null,
        }}
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
  
  const steps: Array<{
    label: string
    status: 'complete' | 'active' | 'pending' | 'error'
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
      label: 'Awaiting verification',
      status: 'pending',
    },
  ]

  // Only show relevant steps (hide pending ones after active)
  const activeIndex = steps.findIndex(s => s.status === 'active')
  const errorIndex = steps.findIndex(s => s.status === 'error')
  
  let visibleSteps: typeof steps
  
  if (errorIndex >= 0) {
    // Show up to and including the error
    visibleSteps = steps.slice(0, errorIndex + 1)
  } else if (activeIndex >= 0) {
    visibleSteps = steps.slice(0, Math.min(activeIndex + 2, steps.length))
  } else {
    visibleSteps = steps.filter(s => s.status === 'complete').slice(-3)
  }

  if (visibleSteps.length === 0) return null

  // Find the error step if any
  const errorStep = visibleSteps.find(s => s.status === 'error')

  return (
    <div className="space-y-1.5">
      {visibleSteps.map((step, i) => {
        const isClickable = step.status === 'complete' && onOpenVerification
        
        const content = (
          <>
            {step.status === 'complete' && (
              <svg className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
