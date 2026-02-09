'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { E2BProvider } from '@/providers/E2BProvider'
import { useAuthContext } from '@/providers/AuthProvider'
import { ErrorBoundary, ChatErrorFallback, PreviewErrorFallback } from '@/components/ErrorBoundary'
import BuilderLayout from '@/components/builder/BuilderLayout'
import { TorbitSpinner } from '@/components/ui/TorbitLogo'
import { useBuilderStore } from '@/store/builder'
import { useProjectPresence } from '@/hooks/useProjectPresence'
import { flushQueuedTelemetryEvents, setMetricsProjectContext } from '@/lib/metrics'

const Sidebar = dynamic(() => import('@/components/builder/Sidebar'))
const ChatPanel = dynamic(() => import('@/components/builder/ChatPanel'))
const PreviewPanel = dynamic(() => import('@/components/builder/PreviewPanel'))
const TasksPanel = dynamic(() => import('@/components/builder/TasksPanel'))
const FuelGauge = dynamic(() => import('@/components/builder/FuelGauge'))
const SoundToggle = dynamic(() => import('@/components/builder/SoundToggle'))
const ShipMenu = dynamic(() => import('@/components/builder/ShipMenu'))
const PublishPanel = dynamic(() => import('@/components/builder/PublishPanel').then((module) => module.PublishPanel))
const ScreenshotButton = dynamic(() => import('@/components/builder/ScreenshotButton').then((module) => module.ScreenshotButton))
const UserMenu = dynamic(() => import('@/components/builder/UserMenu').then((module) => module.UserMenu))
const MobileBuilderShell = dynamic(() => import('@/components/builder/MobileBuilderShell'))
const MobileFilesPanel = dynamic(() => import('@/components/builder/MobileFilesPanel'))

export default function BuilderPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/builder')
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <TorbitSpinner size="lg" />
      </div>
    )
  }

  return (
    <E2BProvider>
      <BuilderPageContent />
    </E2BProvider>
  )
}

function BuilderPageContent() {
  const [showTasks, setShowTasks] = useState(false)
  const [chatKey, setChatKey] = useState(0)
  const [previewKey, setPreviewKey] = useState(0)
  const [isMobileLayout, setIsMobileLayout] = useState<boolean | null>(null)

  const {
    initProject,
    setProjectId,
    projectId,
    prompt,
    previewTab,
    setPreviewTab,
    sidebarCollapsed,
    toggleSidebar,
    agents,
    isGenerating,
  } = useBuilderStore()

  const { members, upsertPresence } = useProjectPresence(projectId)

  const handleChatRetry = useCallback(() => setChatKey((value) => value + 1), [])
  const handlePreviewRetry = useCallback(() => setPreviewKey((value) => value + 1), [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 1023px)')
    const updateLayout = () => setIsMobileLayout(mediaQuery.matches)

    updateLayout()
    mediaQuery.addEventListener('change', updateLayout)

    return () => mediaQuery.removeEventListener('change', updateLayout)
  }, [])

  useEffect(() => {
    if (isMobileLayout) {
      setShowTasks(false)
    }
  }, [isMobileLayout])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedProjectId = sessionStorage.getItem('torbit_project_id')
    if (storedProjectId && !projectId) {
      setProjectId(storedProjectId)
    }
  }, [projectId, setProjectId])

  useEffect(() => {
    const storedPrompt = sessionStorage.getItem('torbit_prompt')
    const storedCapabilityContext = sessionStorage.getItem('torbit_capability_context')

    if (storedPrompt && !prompt) {
      const enhancedPrompt = storedCapabilityContext
        ? `${storedPrompt}\n\n${storedCapabilityContext}`
        : storedPrompt

      initProject(enhancedPrompt)

      sessionStorage.removeItem('torbit_prompt')
      sessionStorage.removeItem('torbit_platform')
      sessionStorage.removeItem('torbit_capabilities')
      sessionStorage.removeItem('torbit_capability_context')
    }
  }, [initProject, prompt])

  useEffect(() => {
    if (!projectId) return

    let active = true
    upsertPresence('online').catch(e => console.warn('[Presence] Failed to set online:', e))

    const heartbeat = setInterval(() => {
      if (!active) return
      upsertPresence('online').catch(e => console.warn('[Presence] Heartbeat failed:', e))
    }, 30000)

    return () => {
      active = false
      clearInterval(heartbeat)
      upsertPresence('offline').catch(e => console.warn('[Presence] Failed to set offline:', e))
    }
  }, [projectId, upsertPresence])

  useEffect(() => {
    void flushQueuedTelemetryEvents().catch(e => console.warn('[Telemetry] Flush failed:', e))
  }, [])

  useEffect(() => {
    setMetricsProjectContext(projectId)
    return () => {
      setMetricsProjectContext(null)
    }
  }, [projectId])

  const onlineCollaboratorCount = useMemo(
    () => members.filter((member) => member.status !== 'offline' && !member.isCurrentUser).length,
    [members]
  )

  const activeAgent = agents.find((agent) => agent.status === 'working' || agent.status === 'thinking')
  const isWorking = isGenerating || Boolean(activeAgent)

  const chatPanel = (
    <ErrorBoundary name="ChatPanel" fallback={<ChatErrorFallback onRetry={handleChatRetry} />}>
      <ChatPanel key={chatKey} />
    </ErrorBoundary>
  )

  const previewPanel = (
    <ErrorBoundary name="PreviewPanel" fallback={<PreviewErrorFallback onRetry={handlePreviewRetry} />}>
      <PreviewPanel key={previewKey} />
    </ErrorBoundary>
  )

  if (isMobileLayout === null) {
    return (
      <BuilderLayout>
        <div className="flex h-full w-full items-center justify-center bg-[#000000]">
          <TorbitSpinner size="md" />
        </div>
      </BuilderLayout>
    )
  }

  if (isMobileLayout) {
    return (
      <BuilderLayout>
        <MobileBuilderShell
          chatPanel={chatPanel}
          previewPanel={previewPanel}
          filesPanel={<MobileFilesPanel />}
          previewTab={previewTab}
          onPreviewTabChange={setPreviewTab}
          isWorking={isWorking}
          onlineCollaboratorCount={onlineCollaboratorCount}
          headerActions={(
            <>
              <Link
                href="/dashboard"
                aria-label="Go to dashboard"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#525252] transition-colors hover:bg-[#141414] hover:text-[#fafafa]"
                title="Dashboard"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
              </Link>
              <FuelGauge />
              <ShipMenu />
              <UserMenu />
            </>
          )}
        />
      </BuilderLayout>
    )
  }

  return (
    <BuilderLayout>
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {chatPanel}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 items-center justify-between gap-2 overflow-hidden border-b border-[#1f1f1f] bg-[#0a0a0a] px-2 sm:px-4">
          <div className="relative z-10 flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
            <span className="hidden text-[13px] font-medium text-[#fafafa] lg:block">App Preview</span>
            <div className="flex items-center rounded-lg border border-[#1f1f1f] bg-[#141414] p-0.5">
              <TabButton
                label="Preview"
                active={previewTab === 'preview'}
                onClick={() => setPreviewTab('preview')}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </TabButton>
              <TabButton
                label="Code"
                active={previewTab === 'code'}
                onClick={() => setPreviewTab('code')}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </TabButton>
            </div>
          </div>

          <div className="relative z-0 ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/dashboard"
              aria-label="Go to dashboard"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#525252] transition-all hover:bg-[#141414] hover:text-[#fafafa]"
              title="Dashboard"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
            </Link>

            <div className="flex items-center gap-1.5 border-r border-[#1f1f1f] px-2">
              {isWorking ? <TorbitSpinner size="xs" speed="fast" /> : <div className="h-1.5 w-1.5 rounded-full bg-[#333]" />}
              <span className="hidden text-[11px] text-[#525252] md:inline">{isWorking ? 'Building...' : 'Idle'}</span>
            </div>

            <div className="hidden items-center gap-1.5 border-r border-[#1f1f1f] px-2 xl:flex">
              <span className={`h-1.5 w-1.5 rounded-full ${onlineCollaboratorCount > 0 ? 'bg-emerald-500' : 'bg-[#333]'}`} />
              <span className="text-[11px] text-[#525252]">
                {onlineCollaboratorCount > 0 ? `${onlineCollaboratorCount + 1} collaborators online` : 'Solo session'}
              </span>
            </div>

            <div className="hidden sm:block">
              <ScreenshotButton />
            </div>
            <div className="hidden lg:block">
              <SoundToggle />
            </div>
            <FuelGauge />
            <ShipMenu />
            <PublishPanel />
            <UserMenu />

            <button
              onClick={() => setShowTasks((value) => !value)}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-all ${
                showTasks ? 'bg-[#1f1f1f] text-[#fafafa]' : 'text-[#525252] hover:bg-[#141414] hover:text-[#a1a1a1]'
              }`}
              title="Tasks"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </header>

        {previewPanel}

        <div
          className={`pointer-events-none absolute bottom-0 right-0 top-11 z-40 w-72 border-l border-[#1f1f1f] bg-[#0a0a0a] shadow-2xl transition-all duration-150 ${
            showTasks ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-6 opacity-0'
          }`}
          aria-hidden={!showTasks}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-10 items-center justify-between border-b border-[#1f1f1f] px-3">
              <span className="text-[12px] font-medium text-[#a1a1a1]">Tasks</span>
              <button
                onClick={() => setShowTasks(false)}
                className="flex h-5 w-5 items-center justify-center rounded text-[#525252] transition-colors hover:bg-[#1a1a1a] hover:text-[#fafafa]"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TasksPanel />
            </div>
          </div>
        </div>
      </div>
    </BuilderLayout>
  )
}

function TabButton({
  children,
  label,
  active,
  onClick,
}: {
  children: ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
        active ? 'bg-[#1f1f1f] text-[#fafafa]' : 'text-[#525252] hover:text-[#a1a1a1]'
      }`}
    >
      {children}
    </button>
  )
}
