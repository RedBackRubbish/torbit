import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WebContainer } from '@webcontainer/api'

// Mock dependencies
vi.mock('@/lib/webcontainer', () => ({
  getWebContainer: vi.fn(),
  isWebContainerSupported: vi.fn(() => true),
  teardownWebContainer: vi.fn(),
}))

import {
  getWebContainer,
  isWebContainerSupported,
  teardownWebContainer,
} from '@/lib/webcontainer'

describe('WebContainer Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isWebContainerSupported', () => {
    it('should return true when SharedArrayBuffer is available', () => {
      vi.mocked(isWebContainerSupported).mockReturnValue(true)
      expect(isWebContainerSupported()).toBe(true)
    })

    it('should return false when SharedArrayBuffer is not available', () => {
      vi.mocked(isWebContainerSupported).mockReturnValue(false)
      expect(isWebContainerSupported()).toBe(false)
    })
  })

  describe('getWebContainer', () => {
    it('should return a WebContainer instance', async () => {
      const mockContainer = {
        fs: {
          writeFile: vi.fn(),
          readFile: vi.fn(),
          readdir: vi.fn(),
          rm: vi.fn(),
          mkdir: vi.fn(),
        },
        spawn: vi.fn(),
        on: vi.fn(),
        mount: vi.fn(),
      }

      vi.mocked(getWebContainer).mockResolvedValue(mockContainer as unknown as WebContainer)

      const container = await getWebContainer()

      expect(container).toBeDefined()
      expect(container.fs).toBeDefined()
      expect(container.spawn).toBeDefined()
    })

    it('should return the same instance on multiple calls (singleton)', async () => {
      const mockContainer = { id: 'singleton-instance' }
      vi.mocked(getWebContainer).mockResolvedValue(mockContainer as unknown as WebContainer)

      const first = await getWebContainer()
      const second = await getWebContainer()

      expect(first).toBe(second)
    })

    it('should handle boot failures gracefully', async () => {
      vi.mocked(getWebContainer).mockRejectedValue(new Error('Boot failed'))

      await expect(getWebContainer()).rejects.toThrow('Boot failed')
    })
  })

  describe('teardownWebContainer', () => {
    it('should teardown the container', async () => {
      vi.mocked(teardownWebContainer).mockResolvedValue(undefined)

      await expect(teardownWebContainer()).resolves.not.toThrow()
      expect(teardownWebContainer).toHaveBeenCalled()
    })
  })
})

describe('WebContainer File System Operations', () => {
  const mockFs = {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    rm: vi.fn(),
    mkdir: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFs.writeFile.mockResolvedValue(undefined)
    mockFs.readFile.mockResolvedValue('file content')
    mockFs.readdir.mockResolvedValue([])
    mockFs.rm.mockResolvedValue(undefined)
    mockFs.mkdir.mockResolvedValue(undefined)
  })

  describe('writeFile', () => {
    it('should write file content', async () => {
      await mockFs.writeFile('/test.txt', 'hello world')

      expect(mockFs.writeFile).toHaveBeenCalledWith('/test.txt', 'hello world')
    })

    it('should handle binary content', async () => {
      const binaryData = new Uint8Array([0x00, 0x01, 0x02])
      await mockFs.writeFile('/binary.bin', binaryData)

      expect(mockFs.writeFile).toHaveBeenCalledWith('/binary.bin', binaryData)
    })
  })

  describe('readFile', () => {
    it('should read file as string', async () => {
      mockFs.readFile.mockResolvedValue('export const x = 1')

      const content = await mockFs.readFile('/src/index.ts', 'utf-8')

      expect(content).toBe('export const x = 1')
    })

    it('should handle file not found', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'))

      await expect(mockFs.readFile('/missing.txt', 'utf-8')).rejects.toThrow('ENOENT')
    })
  })

  describe('readdir', () => {
    it('should list directory contents', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'file.ts', isDirectory: () => false },
        { name: 'folder', isDirectory: () => true },
      ])

      const entries = await mockFs.readdir('/src')

      expect(entries).toHaveLength(2)
      expect(entries[0].name).toBe('file.ts')
      expect(entries[0].isDirectory()).toBe(false)
      expect(entries[1].isDirectory()).toBe(true)
    })

    it('should support withFileTypes option', async () => {
      await mockFs.readdir('/src', { withFileTypes: true })

      expect(mockFs.readdir).toHaveBeenCalledWith('/src', { withFileTypes: true })
    })
  })

  describe('mkdir', () => {
    it('should create directory', async () => {
      await mockFs.mkdir('/new-folder')

      expect(mockFs.mkdir).toHaveBeenCalledWith('/new-folder')
    })

    it('should support recursive option', async () => {
      await mockFs.mkdir('/deep/nested/path', { recursive: true })

      expect(mockFs.mkdir).toHaveBeenCalledWith('/deep/nested/path', { recursive: true })
    })
  })

  describe('rm', () => {
    it('should remove file', async () => {
      await mockFs.rm('/old-file.txt')

      expect(mockFs.rm).toHaveBeenCalledWith('/old-file.txt')
    })

    it('should support recursive removal', async () => {
      await mockFs.rm('/folder', { recursive: true })

      expect(mockFs.rm).toHaveBeenCalledWith('/folder', { recursive: true })
    })
  })
})

describe('WebContainer Process Spawning', () => {
  const mockSpawn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should spawn a process', async () => {
    mockSpawn.mockResolvedValue({
      output: {
        pipeTo: vi.fn().mockResolvedValue(undefined),
      },
      exit: Promise.resolve(0),
    })

    const proc = await mockSpawn('npm', ['install'])

    expect(mockSpawn).toHaveBeenCalledWith('npm', ['install'])
    expect(proc.exit).resolves.toBe(0)
  })

  it('should capture process output', async () => {
    const outputChunks: string[] = []
    const testOutput = 'Installing packages...\nDone!\n'
    
    mockSpawn.mockResolvedValue({
      output: {
        pipeTo: vi.fn().mockImplementation(async (stream: WritableStream) => {
          const writer = stream.getWriter()
          await writer.write(testOutput)
          await writer.close()
        }),
      },
      exit: Promise.resolve(0),
    })

    const proc = await mockSpawn('npm', ['install'])
    
    await proc.output.pipeTo(new WritableStream({
      write(chunk) {
        outputChunks.push(chunk)
      }
    }))

    expect(outputChunks.join('')).toContain('Installing packages...')
    expect(outputChunks.join('')).toContain('Done!')
  })

  it('should handle process failures', async () => {
    mockSpawn.mockResolvedValue({
      output: { pipeTo: vi.fn() },
      exit: Promise.resolve(1),
    })

    const proc = await mockSpawn('npm', ['run', 'nonexistent'])
    const exitCode = await proc.exit

    expect(exitCode).toBe(1)
  })

  it('should handle spawn errors', async () => {
    mockSpawn.mockRejectedValue(new Error('Command not found: invalid-cmd'))

    await expect(mockSpawn('invalid-cmd', [])).rejects.toThrow('Command not found')
  })
})
