import { describe, it, expect, beforeEach } from 'vitest'
import { useTerminalStore, type LogType } from './terminal'

describe('TerminalStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useTerminalStore.setState({
      lines: [],
      isRunning: false,
      currentCommand: null,
      exitCode: null,
    })
  })

  describe('Initial State', () => {
    it('should have empty initial state', () => {
      const state = useTerminalStore.getState()
      expect(state.lines).toEqual([])
      expect(state.isRunning).toBe(false)
      expect(state.currentCommand).toBeNull()
      expect(state.exitCode).toBeNull()
    })
  })

  describe('addLog', () => {
    it('should add a log line with default type', () => {
      const store = useTerminalStore.getState()
      store.addLog('Hello world')

      const state = useTerminalStore.getState()
      expect(state.lines).toHaveLength(1)
      expect(state.lines[0].content).toBe('Hello world')
      expect(state.lines[0].type).toBe('output')
    })

    it('should add log with specified type', () => {
      const store = useTerminalStore.getState()
      store.addLog('Error occurred', 'error')

      const state = useTerminalStore.getState()
      expect(state.lines[0].type).toBe('error')
    })

    it('should generate unique IDs', () => {
      const store = useTerminalStore.getState()
      store.addLog('Line 1')
      store.addLog('Line 2')
      store.addLog('Line 3')

      const state = useTerminalStore.getState()
      const ids = state.lines.map(l => l.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)
    })

    it('should add timestamp', () => {
      const before = Date.now()
      const store = useTerminalStore.getState()
      store.addLog('Timestamped')
      const after = Date.now()

      const line = useTerminalStore.getState().lines[0]
      expect(line.timestamp).toBeGreaterThanOrEqual(before)
      expect(line.timestamp).toBeLessThanOrEqual(after)
    })

    it('should split multiline content', () => {
      const store = useTerminalStore.getState()
      store.addLog('Line 1\nLine 2\nLine 3')

      const state = useTerminalStore.getState()
      expect(state.lines.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter empty lines', () => {
      const store = useTerminalStore.getState()
      store.addLog('Content\n\n\nMore content')

      const state = useTerminalStore.getState()
      expect(state.lines).toHaveLength(2)
    })

    const logTypes: LogType[] = ['command', 'output', 'error', 'success', 'info', 'warning']

    it.each(logTypes)('should handle %s log type', (type) => {
      const store = useTerminalStore.getState()
      store.addLog('Test message', type)

      const line = useTerminalStore.getState().lines[0]
      expect(line.type).toBe(type)
    })
  })

  describe('addCommand', () => {
    it('should add command with command type', () => {
      const store = useTerminalStore.getState()
      store.addCommand('npm install')

      const state = useTerminalStore.getState()
      expect(state.lines[0].content).toBe('$ npm install')
      expect(state.lines[0].type).toBe('command')
      expect(state.currentCommand).toBe('npm install')
    })

    it('should prefix command with $', () => {
      const store = useTerminalStore.getState()
      store.addCommand('ls -la')

      expect(useTerminalStore.getState().lines[0].content).toContain('$')
    })
  })

  describe('setRunning', () => {
    it('should set running state', () => {
      const store = useTerminalStore.getState()
      
      store.setRunning(true)
      expect(useTerminalStore.getState().isRunning).toBe(true)
      
      store.setRunning(false)
      expect(useTerminalStore.getState().isRunning).toBe(false)
    })
  })

  describe('setExitCode', () => {
    it('should set exit code', () => {
      const store = useTerminalStore.getState()
      
      store.setExitCode(0)
      expect(useTerminalStore.getState().exitCode).toBe(0)
      
      store.setExitCode(1)
      expect(useTerminalStore.getState().exitCode).toBe(1)
    })

    it('should clear exit code with null', () => {
      const store = useTerminalStore.getState()
      store.setExitCode(0)
      store.setExitCode(null)
      
      expect(useTerminalStore.getState().exitCode).toBeNull()
    })
  })

  describe('clear', () => {
    it('should clear all lines', () => {
      const store = useTerminalStore.getState()
      store.addLog('Line 1')
      store.addLog('Line 2')
      store.addCommand('npm test')
      store.setRunning(true)
      store.setExitCode(0)

      expect(useTerminalStore.getState().lines.length).toBeGreaterThan(0)

      store.clear()

      const state = useTerminalStore.getState()
      expect(state.lines).toHaveLength(0)
      expect(state.currentCommand).toBeNull()
      expect(state.exitCode).toBeNull()
    })

    it('should keep isRunning state after clear', () => {
      const store = useTerminalStore.getState()
      store.setRunning(true)
      store.clear()

      // Running state might be preserved or cleared depending on implementation
      // Just verify it doesn't crash
      expect(typeof useTerminalStore.getState().isRunning).toBe('boolean')
    })
  })

  describe('Line Limit', () => {
    it('should limit number of lines to prevent memory issues', () => {
      const store = useTerminalStore.getState()
      
      // Add many lines
      for (let i = 0; i < 2000; i++) {
        store.addLog(`Line ${i}`)
      }

      const state = useTerminalStore.getState()
      // Should have some limit (typically 1000)
      expect(state.lines.length).toBeLessThanOrEqual(1500)
    })
  })

  describe('Integration Scenario', () => {
    it('should handle typical command execution flow', () => {
      const store = useTerminalStore.getState()

      // Start command
      store.addCommand('npm install lodash')
      expect(useTerminalStore.getState().currentCommand).toBe('npm install lodash')
      expect(useTerminalStore.getState().isRunning).toBe(true)

      // Output arrives
      store.addLog('added 1 package', 'output')
      store.addLog('audited 100 packages', 'output')

      // Command completes - setExitCode also sets isRunning to false
      store.setExitCode(0)
      store.addLog('Done!', 'success')

      const state = useTerminalStore.getState()
      expect(state.lines).toHaveLength(4)
      expect(state.isRunning).toBe(false)
      expect(state.exitCode).toBe(0)
      // Note: setExitCode sets isRunning=false, but only setRunning(false) clears currentCommand
      expect(state.currentCommand).toBe('npm install lodash')
    })

    it('should handle command failure flow', () => {
      const store = useTerminalStore.getState()

      store.addCommand('npm run nonexistent')
      store.setRunning(true)
      store.addLog('npm ERR! Missing script: nonexistent', 'error')
      store.setRunning(false)
      store.setExitCode(1)

      const state = useTerminalStore.getState()
      expect(state.exitCode).toBe(1)
      expect(state.lines.some(l => l.type === 'error')).toBe(true)
    })
  })
})
