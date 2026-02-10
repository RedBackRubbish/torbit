'use client'

interface RunDiagnosticsState {
  runId: string | null
  intent: string | null
  lastErrorClass: string | null
  recoveryAction: string
  fallbackCount: number
  gateFailures: number
  updatedAt: string | null
}

interface RunDiagnosticsPanelProps {
  diagnostics: RunDiagnosticsState
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'No updates yet'
  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) return 'No updates yet'
  return value.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function RunDiagnosticsPanel({ diagnostics }: RunDiagnosticsPanelProps) {
  if (!diagnostics.runId && diagnostics.fallbackCount === 0 && diagnostics.gateFailures === 0) {
    return null
  }

  return (
    <div className="mt-2 rounded-lg border border-[#171717] bg-[#070707] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#666]">Run Diagnostics</p>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <span className="text-[#5a5a5a]">Intent</span>
        <span className="text-[#b8b8b8] text-right">{diagnostics.intent || 'unknown'}</span>

        <span className="text-[#5a5a5a]">Fallbacks</span>
        <span className="text-[#b8b8b8] text-right">{diagnostics.fallbackCount}</span>

        <span className="text-[#5a5a5a]">Gate Failures</span>
        <span className="text-[#b8b8b8] text-right">{diagnostics.gateFailures}</span>

        <span className="text-[#5a5a5a]">Error Class</span>
        <span className={`text-right ${diagnostics.lastErrorClass ? 'text-[#ff9b9b]' : 'text-[#b8b8b8]'}`}>
          {diagnostics.lastErrorClass || 'none'}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-[#8a8a8a] leading-relaxed">
        {diagnostics.recoveryAction}
      </p>
      <p className="mt-1 text-[10px] text-[#4f4f4f]">
        Updated {formatTimestamp(diagnostics.updatedAt)}
      </p>
    </div>
  )
}

