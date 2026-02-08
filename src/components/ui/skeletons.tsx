'use client'

interface SkeletonBlockProps {
  className?: string
}

export function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-[var(--torbit-white-04)] ${className}`}>
      <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  )
}

interface DashboardProjectGridSkeletonProps {
  count?: number
}

export function DashboardProjectGridSkeleton({ count = 6 }: DashboardProjectGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading projects">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-[var(--torbit-white-08)] bg-[var(--torbit-white-02)]"
        >
          <SkeletonBlock className="aspect-[16/10] rounded-none" />
          <div className="space-y-2 p-4">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface ChatHistorySkeletonProps {
  rows?: number
}

export function ChatHistorySkeleton({ rows = 5 }: ChatHistorySkeletonProps) {
  return (
    <div className="space-y-3 p-4" aria-label="Loading chat messages">
      {Array.from({ length: rows }).map((_, index) => {
        const isAssistant = index % 2 === 0
        return (
          <div key={index} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
            <div className={`space-y-2 ${isAssistant ? 'w-[72%]' : 'w-[58%]'}`}>
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-5/6" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface FileExplorerSkeletonProps {
  rows?: number
}

export function FileExplorerSkeleton({ rows = 9 }: FileExplorerSkeletonProps) {
  return (
    <div className="space-y-2 p-3" aria-label="Loading files">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-2">
          <SkeletonBlock className="h-3.5 w-3.5 rounded-sm" />
          <SkeletonBlock className={`h-3 ${index % 3 === 0 ? 'w-2/3' : 'w-1/2'}`} />
        </div>
      ))}
    </div>
  )
}
