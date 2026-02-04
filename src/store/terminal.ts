import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// ============================================================================
// TERMINAL STORE - Command Output & Logging
// ============================================================================
// Tracks all terminal output from the WebContainer for display in the UI.
// Supports different log types for color-coded output.
// ============================================================================

export type LogType = 'command' | 'output' | 'error' | 'success' | 'info' | 'warning'

export interface TerminalLine {
  id: string
  content: string
  type: LogType
  timestamp: number
}

export interface TerminalState {
  lines: TerminalLine[]
  isRunning: boolean
  currentCommand: string | null
  exitCode: number | null
}

export interface TerminalActions {
  addLog: (content: string, type?: LogType) => void
  addCommand: (command: string) => void
  setRunning: (running: boolean) => void
  setExitCode: (code: number | null) => void
  clear: () => void
}

let lineCounter = 0

export const useTerminalStore = create<TerminalState & TerminalActions>()(
  immer((set) => ({
    // Initial state
    lines: [],
    isRunning: false,
    currentCommand: null,
    exitCode: null,

    addLog: (content, type = 'output') => {
      set((state) => {
        // Split multiline content into separate lines
        const contentLines = content.split('\n').filter(line => line.length > 0)
        
        for (const line of contentLines) {
          state.lines.push({
            id: `line-${++lineCounter}`,
            content: line,
            type,
            timestamp: Date.now(),
          })
        }
        
        // Keep only last 500 lines for performance
        if (state.lines.length > 500) {
          state.lines = state.lines.slice(-500)
        }
      })
    },

    addCommand: (command) => {
      set((state) => {
        state.currentCommand = command
        state.isRunning = true
        state.exitCode = null
        state.lines.push({
          id: `line-${++lineCounter}`,
          content: `$ ${command}`,
          type: 'command',
          timestamp: Date.now(),
        })
      })
    },

    setRunning: (running) => {
      set((state) => {
        state.isRunning = running
        if (!running) {
          state.currentCommand = null
        }
      })
    },

    setExitCode: (code) => {
      set((state) => {
        state.exitCode = code
        state.isRunning = false
      })
    },

    clear: () => {
      set((state) => {
        state.lines = []
        state.isRunning = false
        state.currentCommand = null
        state.exitCode = null
      })
      lineCounter = 0
    },
  }))
)

// Selector hooks for performance
export const useTerminalLines = () => useTerminalStore((s) => s.lines)
export const useTerminalRunning = () => useTerminalStore((s) => s.isRunning)
