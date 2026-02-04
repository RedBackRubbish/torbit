import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'

// Define mock container at the top level
const mockFs = {
  writeFile: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  rm: vi.fn(),
  mkdir: vi.fn(),
}

const mockSpawn = vi.fn()

const mockContainer = {
  fs: mockFs,
  spawn: mockSpawn,
}

// Mock all dependencies before imports
vi.mock('@/lib/webcontainer', () => ({
  getWebContainer: vi.fn(() => Promise.resolve(mockContainer)),
  isWebContainerSupported: vi.fn(() => true),
}))

vi.mock('@/store/terminal', () => ({
  useTerminalStore: {
    getState: () => ({
      addLog: vi.fn(),
      setRunning: vi.fn(),
      setExitCode: vi.fn(),
    }),
  },
}))

vi.mock('@/store/fuel', () => ({
  useFuelStore: {
    getState: () => ({
      currentFuel: 500,
      canAfford: vi.fn(() => true),
      deductPlanner: vi.fn(() => true),
      deductAuditor: vi.fn(() => true),
      holdBuilderCost: vi.fn(() => 'tx-123'),
      finalizeBuilderCost: vi.fn(),
    }),
  },
}))

vi.mock('@/store/timeline', () => ({
  useTimeline: {
    getState: () => ({
      addStep: vi.fn(() => 'step-123'),
      appendThinking: vi.fn(),
      completeStep: vi.fn(),
      failStep: vi.fn(),
    }),
  },
}))

vi.mock('@/lib/nervous-system', () => ({
  NervousSystem: {
    analyzeLog: vi.fn(() => null),
    dispatchPain: vi.fn(),
  },
}))

// Import after mocks are set up
import { ExecutorService } from '@/services/executor'
import { isWebContainerSupported } from '@/lib/webcontainer'

describe('ExecutorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset isWebContainerSupported to return true by default
    vi.mocked(isWebContainerSupported).mockReturnValue(true)

    // Reset mock implementations
    mockFs.writeFile.mockResolvedValue(undefined)
    mockFs.readFile.mockResolvedValue('file content')
    mockFs.readdir.mockResolvedValue([
      { name: 'file.ts', isDirectory: () => false },
      { name: 'folder', isDirectory: () => true },
    ])
    mockFs.rm.mockResolvedValue(undefined)
    mockFs.mkdir.mockResolvedValue(undefined)

    mockSpawn.mockResolvedValue({
      output: {
        pipeTo: vi.fn().mockResolvedValue(undefined),
      },
      exit: Promise.resolve(0),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('executeTool', () => {
    describe('File Operations', () => {
      it('should create a file successfully', async () => {
        const result = await ExecutorService.executeTool('createFile', {
          path: 'src/test.ts',
          content: 'console.log("hello")',
        })

        expect(result.success).toBe(true)
        expect(result.output).toContain('SUCCESS')
        expect(result.output).toContain('src/test.ts')
        expect(mockFs.mkdir).toHaveBeenCalledWith('src', { recursive: true })
        expect(mockFs.writeFile).toHaveBeenCalledWith(
          'src/test.ts',
          'console.log("hello")'
        )
      })

      it('should create file in root without mkdir', async () => {
        const result = await ExecutorService.executeTool('createFile', {
          path: 'test.ts',
          content: 'hello',
        })

        expect(result.success).toBe(true)
        expect(mockFs.mkdir).not.toHaveBeenCalled()
        expect(mockFs.writeFile).toHaveBeenCalledWith('test.ts', 'hello')
      })

      it('should read a file successfully', async () => {
        mockFs.readFile.mockResolvedValue('export const foo = 42')

        const result = await ExecutorService.executeTool('readFile', {
          path: 'src/lib/utils.ts',
        })

        expect(result.success).toBe(true)
        expect(result.output).toBe('export const foo = 42')
        expect(mockFs.readFile).toHaveBeenCalledWith('src/lib/utils.ts', 'utf-8')
      })

      it('should edit a file successfully', async () => {
        const result = await ExecutorService.executeTool('editFile', {
          path: 'src/app.ts',
          content: 'updated content',
        })

        expect(result.success).toBe(true)
        expect(result.output).toContain('SUCCESS')
        expect(mockFs.writeFile).toHaveBeenCalledWith('src/app.ts', 'updated content')
      })

      it('should list files in a directory', async () => {
        const result = await ExecutorService.executeTool('listFiles', {
          path: 'src',
        })

        expect(result.success).toBe(true)
        expect(result.output).toContain('file.ts')
        expect(result.output).toContain('folder/')
      })

      it('should delete a file successfully', async () => {
        const result = await ExecutorService.executeTool('deleteFile', {
          path: 'src/old.ts',
        })

        expect(result.success).toBe(true)
        expect(result.output).toContain('Deleted')
        expect(mockFs.rm).toHaveBeenCalledWith('src/old.ts', { recursive: true })
      })
    })

    describe('Terminal Operations', () => {
      it('should run a terminal command successfully', async () => {
        const result = await ExecutorService.executeTool('runTerminal', {
          command: 'echo hello',
        })

        expect(result.success).toBe(true)
        expect(result.output).toContain('SUCCESS')
        expect(mockSpawn).toHaveBeenCalledWith('echo', ['hello'])
      })

      it('should handle command failure', async () => {
        mockSpawn.mockResolvedValue({
          output: { pipeTo: vi.fn() },
          exit: Promise.resolve(1),
        })

        const result = await ExecutorService.executeTool('runTerminal', {
          command: 'false',
        })

        expect(result.success).toBe(true) // Tool succeeded, command failed
        expect(result.output).toContain('ERROR')
        expect(result.output).toContain('exit code 1')
      })

      it('should install a package', async () => {
        const result = await ExecutorService.executeTool('installPackage', {
          packageName: 'lodash',
        })

        expect(result.success).toBe(true)
        expect(result.output).toContain('SUCCESS')
        expect(result.output).toContain('lodash')
        expect(mockSpawn).toHaveBeenCalledWith('npm', ['install', 'lodash'])
      })

      it('should install a dev dependency', async () => {
        const result = await ExecutorService.executeTool('installPackage', {
          packageName: 'vitest',
          dev: true,
        })

        expect(result.success).toBe(true)
        expect(mockSpawn).toHaveBeenCalledWith('npm', [
          'install',
          '--save-dev',
          'vitest',
        ])
      })
    })

    describe('Testing Operations', () => {
      it('should run tests successfully', async () => {
        const result = await ExecutorService.executeTool('runTests', {})

        expect(result.success).toBe(true)
        expect(result.output).toContain('TESTS_PASSED')
        expect(mockSpawn).toHaveBeenCalledWith('npm', [
          'test',
          '--',
          '--passWithNoTests',
        ])
      })

      it('should report test failures', async () => {
        mockSpawn.mockResolvedValue({
          output: { pipeTo: vi.fn() },
          exit: Promise.resolve(1),
        })

        const result = await ExecutorService.executeTool('runTests', {})

        expect(result.success).toBe(true)
        expect(result.output).toContain('TESTS_FAILED')
      })

      it('should verify dependency graph', async () => {
        mockFs.readFile.mockResolvedValue(
          JSON.stringify({
            dependencies: { react: '19.0.0', next: '15.0.0' },
            devDependencies: { vitest: '2.0.0' },
          })
        )

        const result = await ExecutorService.executeTool('verifyDependencyGraph', {})

        expect(result.success).toBe(true)
        expect(result.output).toContain('DEPENDENCIES_VERIFIED')
        expect(result.output).toContain('2 dependencies')
        expect(result.output).toContain('1 devDependencies')
      })

      it('should handle missing package.json', async () => {
        mockFs.readFile.mockRejectedValue(new Error('File not found'))

        const result = await ExecutorService.executeTool('verifyDependencyGraph', {})

        expect(result.success).toBe(true)
        expect(result.output).toContain('ERROR')
        expect(result.output).toContain('package.json')
      })
    })

    describe('Thinking', () => {
      it('should record thoughts', async () => {
        const result = await ExecutorService.executeTool('think', {
          thought: 'I should create the component first, then the styles',
        })

        expect(result.success).toBe(true)
        expect(result.output).toContain('THOUGHT_RECORDED')
      })
    })

    describe('Unknown Tools', () => {
      it('should return error for unknown tool', async () => {
        const result = await ExecutorService.executeTool('unknownTool', {})

        expect(result.success).toBe(true) // Tool execution succeeded
        expect(result.output).toContain('ERROR')
        expect(result.output).toContain('Unknown tool')
        expect(result.output).toContain('unknownTool')
      })
    })

    describe('WebContainer Not Supported', () => {
      it('should return error when WebContainer not supported', async () => {
        vi.mocked(isWebContainerSupported).mockReturnValue(false)

        const result = await ExecutorService.executeTool('createFile', {
          path: 'test.ts',
          content: 'hello',
        })

        expect(result.success).toBe(false)
        expect(result.output).toContain('WebContainer not supported')
      })
    })

    describe('Error Handling', () => {
      it('should handle WebContainer errors gracefully', async () => {
        mockFs.writeFile.mockRejectedValue(new Error('Disk full'))

        const result = await ExecutorService.executeTool('createFile', {
          path: 'test.ts',
          content: 'hello',
        })

        expect(result.success).toBe(false)
        expect(result.output).toContain('ERROR')
        expect(result.output).toContain('Disk full')
      })
    })
  })

  describe('Utility Methods', () => {
    it('should check if tool is available', () => {
      expect(ExecutorService.isToolAvailable('createFile')).toBe(true)
      expect(ExecutorService.isToolAvailable('editFile')).toBe(true)
      expect(ExecutorService.isToolAvailable('runTerminal')).toBe(true)
      expect(ExecutorService.isToolAvailable('magicTool')).toBe(false)
    })

    it('should get fuel cost for tools', () => {
      expect(ExecutorService.getFuelCost('createFile')).toBe(5)
      expect(ExecutorService.getFuelCost('readFile')).toBe(2)
      expect(ExecutorService.getFuelCost('runTerminal')).toBe(15)
      expect(ExecutorService.getFuelCost('installPackage')).toBe(25)
      expect(ExecutorService.getFuelCost('unknownTool')).toBe(5) // default
    })
  })

  describe('executeToolBatch', () => {
    it('should execute multiple tools in sequence', async () => {
      const tools = [
        { name: 'createFile', args: { path: 'a.ts', content: 'a' } },
        { name: 'createFile', args: { path: 'b.ts', content: 'b' } },
      ]

      const results = await ExecutorService.executeToolBatch(tools)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2)
    })

    it('should stop on first error (fail-fast)', async () => {
      mockFs.writeFile
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed'))

      const tools = [
        { name: 'createFile', args: { path: 'a.ts', content: 'a' } },
        { name: 'createFile', args: { path: 'b.ts', content: 'b' } },
        { name: 'createFile', args: { path: 'c.ts', content: 'c' } },
      ]

      const results = await ExecutorService.executeToolBatch(tools)

      expect(results).toHaveLength(2) // Stopped after second failed
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
    })
  })
})
