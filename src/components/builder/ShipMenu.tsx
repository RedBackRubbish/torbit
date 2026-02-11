'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'
import { getEstimatedCostTier } from '@/lib/integrations/capabilities'
import { recordMetric } from '@/lib/metrics/success'
import { ExecutorService } from '@/services/executor'
import { useLedger } from '@/store/ledger'
import { createWebExportZip, downloadWebExportBlob, getWebExportFilename } from '@/lib/web/export'
import { onPreDeploy, formatHealthSummary } from '@/lib/integrations/health'
import { enforcePreDeploy } from '@/lib/integrations/policies/enforcement'

/**
 * ShipMenu - Premium Deploy Button for Web Apps
 * 
 * Only shows for web projects (Vercel, Netlify deployment)
 * Hidden for mobile apps (use Publish for iOS/Android release instead)
 */
export default function ShipMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [hasExportedBefore, setHasExportedBefore] = useState(true) // Assume true until checked
  const [showFirstExportHint, setShowFirstExportHint] = useState(false)
  const [firstExportType, setFirstExportType] = useState<'vercel' | 'netlify' | 'github' | 'zip'>('vercel')
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error' | 'info'
    title: string
    message: string
  } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const { projectType, files, projectName, setPendingHealRequest } = useBuilderStore()
  const { recordExport, getPhaseStatus, entries } = useLedger()
  const isMobile = projectType === 'mobile'
  const hasFiles = files.length > 0
  const packageJsonContent = useMemo(() => {
    const pkg = files.find((file) => file.path === 'package.json' || file.path === '/package.json')
    return pkg?.content ?? null
  }, [files])
  
  // Check first export status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const exported = localStorage.getItem('torbit_has_exported')
      setHasExportedBefore(!!exported)
    }
  }, [])
  
  // Get selected capabilities from session storage
  const selectedCapabilities = useMemo(() => {
    if (!isOpen || typeof window === 'undefined') return []
    try {
      const stored = sessionStorage.getItem('torbit_capabilities')
      return stored ? JSON.parse(stored) as string[] : []
    } catch {
      return []
    }
  }, [isOpen]) // Re-check when menu opens
  
  const hasCapabilities = selectedCapabilities.length > 0
  const complexityTier = useMemo(() => getEstimatedCostTier(selectedCapabilities), [selectedCapabilities])
  
  // Complexity tier display
  const complexityLabels = {
    low: { label: 'Low', color: 'text-emerald-500/70' },
    medium: { label: 'Medium', color: 'text-amber-500/70' },
    high: { label: 'High', color: 'text-orange-500/70' }
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const extractFirstUrl = (text: string): string | null => {
    const match = text.match(/https?:\/\/[^\s)]+/i)
    return match ? match[0] : null
  }

  const extractDeployBlockers = (text: string): string[] => {
    const blockersMatch = text.match(/Blockers:\s*([^\n]+)/i)
    if (!blockersMatch?.[1]) return []

    return blockersMatch[1]
      .split('|')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  }

  const getSessionToken = (key: string): string | null => {
    if (typeof window === 'undefined') return null
    const value = window.sessionStorage.getItem(key)
    return value && value.trim().length > 0 ? value.trim() : null
  }

  const requestSessionToken = (key: string, promptLabel: string): string | null => {
    const existing = getSessionToken(key)
    if (existing) return existing
    if (typeof window === 'undefined') return null

    const entered = window.prompt(promptLabel)
    const token = entered?.trim()
    if (!token) return null

    window.sessionStorage.setItem(key, token)
    return token
  }

  const getDeployCredentials = (provider: 'vercel' | 'netlify') => {
    if (provider === 'vercel') {
      const token = requestSessionToken(
        'torbit_vercel_token',
        'Enter your Vercel access token (saved for this browser session only):'
      )
      return token ? { vercelToken: token } : null
    }

    const token = requestSessionToken(
      'torbit_netlify_token',
      'Enter your Netlify access token (saved for this browser session only):'
    )
    return token ? { netlifyToken: token } : null
  }

  const getGithubToken = (): string | null => (
    requestSessionToken(
      'torbit_github_token',
      'Enter your GitHub personal access token (saved for this browser session only):'
    )
  )

  const canDeploy = () => {
    if (!hasFiles) {
      return { allowed: false, reason: 'Generate files before deploying.' }
    }

    if (!packageJsonContent) {
      return { allowed: false, reason: 'Deploy requires a generated project with package.json.' }
    }

    const auditorPassed = getPhaseStatus('verify') === 'complete'
    if (!auditorPassed) {
      return { allowed: false, reason: 'Run verification first. Deploy requires Auditor pass.' }
    }

    return { allowed: true, reason: null as string | null }
  }

  const runDeploy = async (provider: 'vercel' | 'netlify') => {
    setIsOpen(false)
    setIsDeploying(true)
    setFeedback(null)

    try {
      const gate = canDeploy()
      if (!gate.allowed) {
        setFeedback({
          tone: 'error',
          title: 'Deploy blocked',
          message: gate.reason || 'Pre-deploy checks failed.',
        })
        return
      }

      const health = await onPreDeploy({ packageJsonContent: packageJsonContent || '{}' })
      const hasCritical = health.report.status === 'critical'

      const policy = enforcePreDeploy({
        isDriftPresent: health.report.issues.some((issue) => issue.type === 'version-drift'),
        hasLedgerViolations: false,
        healthCheckPassed: !hasCritical,
        auditorPassed: true,
        target: provider,
      })

      if (hasCritical || !policy.proceed) {
        setFeedback({
          tone: 'error',
          title: 'Deploy blocked',
          message: hasCritical ? formatHealthSummary(health.report) : policy.userMessage,
        })
        return
      }

      const credentials = getDeployCredentials(provider)
      if (!credentials) {
        setFeedback({
          tone: 'error',
          title: 'Deploy blocked',
          message: `A ${provider === 'vercel' ? 'Vercel' : 'Netlify'} token is required to deploy.`,
        })
        return
      }

      const deployResult = await ExecutorService.executeTool('deployToProduction', {
        provider,
        projectName: projectName || 'Torbit Project',
        framework: 'auto',
        credentials,
        files: files.map((file) => ({ path: file.path, content: file.content })),
      })

      if (!deployResult.success) {
        const blockers = extractDeployBlockers(deployResult.output || '')
        if (blockers.length > 0) {
          setPendingHealRequest({
            error: `Deploy blocked: ${blockers.join(' | ')}`,
            suggestion: 'Fix every deploy blocker, re-run safety checks, and prepare for re-deploy.',
          })
          setFeedback({
            tone: 'error',
            title: 'Deploy blocked, auto-fix started',
            message: 'Torbit detected blocker(s), queued an automatic fix pass, and will re-check readiness.',
          })
          return
        }

        setFeedback({
          tone: 'error',
          title: 'Deploy failed',
          message: deployResult.output,
        })
        return
      }

      const deployUrl = extractFirstUrl(deployResult.output)
      recordExport(`${provider}-deploy`, true, selectedCapabilities)
      markFirstExport(provider)

      setFeedback({
        tone: 'success',
        title: `${provider === 'vercel' ? 'Vercel' : 'Netlify'} deploy started`,
        message: deployUrl
          ? `Production URL opened: ${deployUrl}`
          : 'Deploy command completed successfully.',
      })

      if (deployUrl && typeof window !== 'undefined') {
        window.open(deployUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Deploy failed',
        message: error instanceof Error ? error.message : 'Unknown deploy error.',
      })
    } finally {
      setIsDeploying(false)
    }
  }

  const handleGitHubPR = async () => {
    setIsOpen(false)
    setFeedback(null)

    if (!hasFiles) {
      setFeedback({
        tone: 'error',
        title: 'Export blocked',
        message: 'Generate files before exporting to GitHub.',
      })
      return
    }

    try {
      const githubToken = getGithubToken()
      if (!githubToken) {
        setFeedback({
          tone: 'error',
          title: 'GitHub export blocked',
          message: 'A GitHub token is required to create repositories and pull requests.',
        })
        return
      }

      const exportBranch = `torbit-export-${Date.now().toString(36)}`
      const githubResult = await ExecutorService.executeTool('syncToGithub', {
        operation: 'pull-request',
        token: githubToken,
        projectName: projectName || 'Torbit Project',
        repoName: (projectName || 'torbit-project').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        branch: exportBranch,
        baseBranch: 'main',
        commitMessage: 'Export from TORBIT',
        prTitle: `TORBIT export: ${projectName || 'Torbit Project'}`,
        prDescription: 'Automated export from TORBIT.',
        files: files.map((file) => ({ path: file.path, content: file.content })),
      })

      if (!githubResult.success) {
        setFeedback({
          tone: 'error',
          title: 'GitHub export failed',
          message: githubResult.output,
        })
        return
      }

      const githubUrl = extractFirstUrl(githubResult.output)
      if (githubUrl && typeof window !== 'undefined') {
        window.open(githubUrl, '_blank', 'noopener,noreferrer')
      }

      recordExport('github', true, selectedCapabilities)
      markFirstExport('github')
      setFeedback({
        tone: 'success',
        title: 'GitHub sync complete',
        message: githubUrl
          ? `Pull request opened: ${githubUrl}`
          : 'Repository synced successfully.',
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'GitHub export failed',
        message: error instanceof Error ? error.message : 'Unknown export error.',
      })
    }
  }

  const handleDownloadZip = async () => {
    setIsOpen(false)
    setFeedback(null)

    if (!hasFiles) {
      setFeedback({
        tone: 'error',
        title: 'Export blocked',
        message: 'Generate files before downloading ZIP.',
      })
      return
    }

    try {
      const blob = await createWebExportZip(
        files.map((file) => ({ path: file.path, content: file.content })),
        {
          projectName: projectName || 'Torbit Project',
          target: 'zip',
          ledgerEntries: entries,
        }
      )
      const filename = getWebExportFilename(projectName || 'Torbit Project')
      downloadWebExportBlob(blob, filename)

      recordExport('zip', true, selectedCapabilities)
      markFirstExport('zip')
      setFeedback({
        tone: 'success',
        title: 'ZIP exported',
        message: `${files.length} file${files.length === 1 ? '' : 's'} bundled for deployment.`,
      })
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'ZIP export failed',
        message: error instanceof Error ? error.message : 'Unknown export error.',
      })
    }
  }
  
  // Track first export and show success hint
  const markFirstExport = (type: 'vercel' | 'netlify' | 'github' | 'zip') => {
    setFirstExportType(type)
    // Record export metrics (Phase 6)
    recordMetric('export_initiated', { exportType: type })
    recordMetric('export_downloaded', { exportType: type })
    
    if (typeof window !== 'undefined' && !hasExportedBefore) {
      localStorage.setItem('torbit_has_exported', 'true')
      localStorage.setItem('torbit_first_export_type', type)
      setHasExportedBefore(true)
      setShowFirstExportHint(true)
      // Auto-dismiss hint after 8 seconds
      setTimeout(() => {
        setShowFirstExportHint(false)
        // Record that user saw the hint (implies export was "opened")
        recordMetric('export_opened', { exportType: type })
      }, 8000)
    }
  }
  
  const handleVercelDeploy = () => void runDeploy('vercel')
  
  const handleNetlifyDeploy = () => void runDeploy('netlify')

  // Hide Deploy button for mobile apps (they use Publish for mobile release)
  if (isMobile) {
    return null
  }

  const hasVercelToken = typeof window !== 'undefined' && !!window.sessionStorage.getItem('torbit_vercel_token')
  const hasNetlifyToken = typeof window !== 'undefined' && !!window.sessionStorage.getItem('torbit_netlify_token')
  const hasGithubToken = typeof window !== 'undefined' && !!window.sessionStorage.getItem('torbit_github_token')

  return (
    <div ref={menuRef} className="relative flex items-center group/deploy" role="group" aria-label="Deploy options">
      {/* Deploy Button Group */}
      <div className="flex items-center rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-[#404040] transition-all duration-300">
        {/* Primary Action: Deploy */}
        <button
          onClick={() => void runDeploy('vercel')}
          disabled={isDeploying}
          aria-label={isDeploying ? 'Deploying your web app to production' : 'Deploy your web app to production hosting'}
          aria-busy={isDeploying}
          className={`
            group relative flex items-center gap-2 px-3.5 py-1.5 text-[12px] font-medium tracking-wide transition-all duration-200 overflow-hidden
            ${isDeploying
              ? 'bg-[#1a1a1a] text-[#808080] cursor-wait'
              : 'bg-[#141414] text-[#e0e0e0] hover:bg-[#1f1f1f] hover:text-white'
            }
            active:scale-[0.98]
          `}
        >
          {isDeploying ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Deploying</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-[#808080] group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
              <span>Deploy</span>
            </>
          )}
        </button>

        {/* Dropdown Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center justify-center w-7 py-1.5 border-l border-[#2a2a2a] transition-all duration-200
            ${isOpen
              ? 'bg-[#1f1f1f] text-[#e0e0e0]'
              : 'bg-[#141414] text-[#606060] hover:bg-[#1f1f1f] hover:text-[#a0a0a0]'
            }
          `}
          aria-label="More deploy options"
          aria-expanded={isOpen}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {feedback && (
        <div
          className={`absolute top-full right-0 mt-2 z-50 w-72 rounded-xl border px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${
            feedback.tone === 'error'
              ? 'bg-[#0c0c0c] border-red-500/20'
              : feedback.tone === 'success'
                ? 'bg-[#0c0c0c] border-emerald-500/20'
                : 'bg-[#0c0c0c] border-[#1f1f1f]'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
              feedback.tone === 'error' ? 'bg-red-500' : feedback.tone === 'success' ? 'bg-emerald-500' : 'bg-[#808080]'
            }`} />
            <div>
              <p className="text-[11px] font-medium text-[#d0d0d0]">{feedback.title}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-[#606060]">{feedback.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full right-0 mt-2 w-72 z-50"
          >
            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden">
              {/* Capabilities banner */}
              {hasCapabilities && (
                <div className="px-3.5 py-2.5 border-b border-[#1a1a1a]">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-amber-500/60" />
                    <span className="text-[10px] text-amber-500/70">
                      {selectedCapabilities.length} {selectedCapabilities.length === 1 ? 'capability' : 'capabilities'} need production credentials
                    </span>
                  </div>
                </div>
              )}

              {/* Deploy section */}
              <div className="p-2">
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-[#4a4a4a] uppercase tracking-widest">Deploy</span>
                </div>

                {/* Vercel */}
                <button
                  onClick={handleVercelDeploy}
                  className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-[#161616] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#222] flex items-center justify-center group-hover:border-[#444] transition-colors">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 22.525H0l12-21.05 12 21.05z" />
                    </svg>
                  </div>
                  <div className="flex-1 flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-[#d0d0d0] group-hover:text-white transition-colors">Vercel</span>
                      {hasVercelToken && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Connected" />}
                    </div>
                    <span className="text-[10px] text-[#505050]">Edge-optimized hosting</span>
                  </div>
                  <svg className="w-3.5 h-3.5 text-[#333] group-hover:text-[#666] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>

                {/* Netlify */}
                <button
                  onClick={handleNetlifyDeploy}
                  className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-[#161616] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#222] flex items-center justify-center group-hover:border-[#444] transition-colors">
                    <svg className="w-4 h-4 text-[#30c8c9]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.3 6.3L16 4.7l-4 4-4-4L6.7 6.3l4 4-4 4L8 15.7l4-4 4 4 1.3-1.4-4-4z" />
                    </svg>
                  </div>
                  <div className="flex-1 flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-[#d0d0d0] group-hover:text-white transition-colors">Netlify</span>
                      {hasNetlifyToken && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Connected" />}
                    </div>
                    <span className="text-[10px] text-[#505050]">Serverless + edge functions</span>
                  </div>
                  <svg className="w-3.5 h-3.5 text-[#333] group-hover:text-[#666] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#1a1a1a] mx-3" />

              {/* Export section */}
              <div className="p-2">
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-[#4a4a4a] uppercase tracking-widest">Export</span>
                </div>

                {/* GitHub */}
                <button
                  onClick={handleGitHubPR}
                  className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-[#161616] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#222] flex items-center justify-center group-hover:border-[#444] transition-colors">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                  <div className="flex-1 flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-[#d0d0d0] group-hover:text-white transition-colors">GitHub</span>
                      {hasGithubToken && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Connected" />}
                    </div>
                    <span className="text-[10px] text-[#505050]">Push code + open PR</span>
                  </div>
                  <svg className="w-3.5 h-3.5 text-[#333] group-hover:text-[#666] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>

                {/* Download ZIP */}
                <button
                  onClick={handleDownloadZip}
                  className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-[#161616] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#222] flex items-center justify-center group-hover:border-[#444] transition-colors">
                    <svg className="w-4 h-4 text-[#808080]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </div>
                  <div className="flex-1 flex flex-col items-start">
                    <span className="text-[12px] font-medium text-[#d0d0d0] group-hover:text-white transition-colors">Download ZIP</span>
                    <span className="text-[10px] text-[#505050]">Bundle with audit ledger</span>
                  </div>
                  <svg className="w-3.5 h-3.5 text-[#333] group-hover:text-[#666] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* First Export Success Hint - 5.3 (web projects only since ShipMenu hides for mobile) */}
      <AnimatePresence>
        {showFirstExportHint && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-56 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg shadow-xl p-3"
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-[#a8a8a8]">
                {firstExportType === 'github'
                  ? 'GitHub export opened'
                  : firstExportType === 'zip'
                    ? 'ZIP export complete'
                    : firstExportType === 'netlify'
                      ? 'Deploy to Netlify'
                      : 'Deploy to Vercel'}
              </span>
              <span className="text-[10px] text-[#505050] leading-relaxed">
                {firstExportType === 'github'
                  ? 'Review the generated pull request, merge, then connect the repo to deploy.'
                  : firstExportType === 'zip'
                    ? 'Push this ZIP to GitHub and connect it to Vercel or Netlify.'
                    : firstExportType === 'netlify'
                      ? 'Confirm environment variables, then publish from Netlify dashboard.'
                      : 'Unzip, push to GitHub, and connect to Vercel.'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
