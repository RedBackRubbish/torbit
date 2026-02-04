import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock ExecutorService
vi.mock('@/services/executor', () => ({
  ExecutorService: {
    executeTool: vi.fn(),
    executeToolBatch: vi.fn(),
    isToolAvailable: vi.fn((name: string) => ['createFile', 'editFile', 'readFile'].includes(name)),
    getFuelCost: vi.fn((name: string) => name === 'createFile' ? 5 : 10),
  },
}))

// Mock stores
vi.mock('@/store/terminal', () => ({
  useTerminalStore: () => ({
    addLog: vi.fn(),
  }),
}))

vi.mock('@/store/timeline', () => ({
  useTimeline: () => ({
    addStep: vi.fn(() => 'step-123'),
    completeStep: vi.fn(),
    failStep: vi.fn(),
  }),
}))

vi.mock('@/store/fuel', () => ({
  useFuelStore: () => ({
    canAfford: vi.fn(() => true),
  }),
}))

import { useToolExecutor, type ToolCallEvent, type ToolResultEvent } from './useToolExecutor'
import { ExecutorService } from '@/services/executor'

describe('useToolExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(ExecutorService.executeTool).mockResolvedValue({
      success: true,
      output: 'SUCCESS: Operation completed',
      duration: 50,
      fuelConsumed: 5,
    })
    
    vi.mocked(ExecutorService.executeToolBatch).mockResolvedValue([
      { success: true, output: 'SUCCESS', duration: 10 },
      { success: true, output: 'SUCCESS', duration: 10 },
    ])
  })

  describe('executeToolCall', () => {
    it('should execute a tool call and return result', async () => {
      const { result } = renderHook(() => useToolExecutor())

      const toolCall: ToolCallEvent = {
        id: 'tool-1',
        name: 'createFile',
        args: { path: 'test.ts', content: 'hello' },
      }

      let toolResult: ToolResultEvent
      await act(async () => {
        toolResult = await result.current.executeToolCall(toolCall)
      })

      expect(toolResult).toEqual({
        id: 'tool-1',
        success: true,
        output: 'SUCCESS: Operation completed',
        duration: 50,
        fuelConsumed: 5,
      })

      expect(ExecutorService.executeTool).toHaveBeenCalledWith('createFile', {
        path: 'test.ts',
        content: 'hello',
      })
    })

    it('should handle tool execution failure', async () => {
      vi.mocked(ExecutorService.executeTool).mockResolvedValue({
        success: false,
        output: 'ERROR: Something went wrong',
        duration: 20,
      })

      const { result } = renderHook(() => useToolExecutor())

      const toolCall: ToolCallEvent = {
        id: 'tool-2',
        name: 'createFile',
        args: { path: 'bad.ts', content: '' },
      }

      let toolResult: ToolResultEvent
      await act(async () => {
        toolResult = await result.current.executeToolCall(toolCall)
      })

      expect(toolResult.success).toBe(false)
      expect(toolResult.output).toContain('ERROR')
    })

    it('should handle executor exceptions', async () => {
      vi.mocked(ExecutorService.executeTool).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useToolExecutor())

      const toolCall: ToolCallEvent = {
        id: 'tool-3',
        name: 'createFile',
        args: { path: 'test.ts', content: 'hello' },
      }

      let toolResult: ToolResultEvent
      await act(async () => {
        toolResult = await result.current.executeToolCall(toolCall)
      })

      expect(toolResult.success).toBe(false)
      expect(toolResult.output).toContain('Network error')
    })
  })

  describe('executeToolBatch', () => {
    it('should execute multiple tool calls in sequence', async () => {
      const { result } = renderHook(() => useToolExecutor())

      const toolCalls: ToolCallEvent[] = [
        { id: 'batch-1', name: 'createFile', args: { path: 'a.ts', content: 'a' } },
        { id: 'batch-2', name: 'createFile', args: { path: 'b.ts', content: 'b' } },
      ]

      let results: ToolResultEvent[]
      await act(async () => {
        results = await result.current.executeToolBatch(toolCalls)
      })

      expect(results).toHaveLength(2)
      // The hook's batch executes each tool individually via executeToolCall
      expect(ExecutorService.executeTool).toHaveBeenCalledTimes(2)
      expect(ExecutorService.executeTool).toHaveBeenCalledWith('createFile', { path: 'a.ts', content: 'a' })
      expect(ExecutorService.executeTool).toHaveBeenCalledWith('createFile', { path: 'b.ts', content: 'b' })
    })

    it('should stop on first error (fail-fast)', async () => {
      vi.mocked(ExecutorService.executeTool)
        .mockResolvedValueOnce({ success: true, output: 'OK', duration: 10 })
        .mockResolvedValueOnce({ success: false, output: 'ERROR', duration: 10 })

      const { result } = renderHook(() => useToolExecutor())

      const toolCalls: ToolCallEvent[] = [
        { id: 'batch-1', name: 'createFile', args: { path: 'a.ts', content: 'a' } },
        { id: 'batch-2', name: 'createFile', args: { path: 'b.ts', content: 'b' } },
        { id: 'batch-3', name: 'createFile', args: { path: 'c.ts', content: 'c' } },
      ]

      let results: ToolResultEvent[]
      await act(async () => {
        results = await result.current.executeToolBatch(toolCalls)
      })

      // Should have stopped after second failed
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(ExecutorService.executeTool).toHaveBeenCalledTimes(2) // Not 3
    })
  })

  describe('isToolPending', () => {
    it('should track pending tools', async () => {
      // Delay the executor to test pending state
      vi.mocked(ExecutorService.executeTool).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          output: 'SUCCESS',
          duration: 100,
        }), 100))
      )

      const { result } = renderHook(() => useToolExecutor())

      const toolCall: ToolCallEvent = {
        id: 'pending-1',
        name: 'createFile',
        args: { path: 'test.ts', content: 'hello' },
      }

      // Start execution (don't await)
      let promise: Promise<ToolResultEvent>
      act(() => {
        promise = result.current.executeToolCall(toolCall)
      })

      // Should be pending immediately
      expect(result.current.isToolPending('pending-1')).toBe(true)

      // Wait for completion
      await act(async () => {
        await promise
      })

      // Should no longer be pending
      expect(result.current.isToolPending('pending-1')).toBe(false)
    })
  })

  describe('canExecute', () => {
    it('should check if tool is available', () => {
      const { result } = renderHook(() => useToolExecutor())

      expect(result.current.canExecute('createFile')).toBe(true)
      expect(result.current.canExecute('unknownTool')).toBe(false)
    })
  })

  describe('getFuelCost', () => {
    it('should return fuel cost for tool', () => {
      const { result } = renderHook(() => useToolExecutor())

      expect(result.current.getFuelCost('createFile')).toBe(5)
      expect(result.current.getFuelCost('readFile')).toBe(10)
    })
  })
})
