import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import type { LedgerEntry } from '@/store/ledger'
import { createWebExportZip, getWebExportFilename } from './export'

describe('web export', () => {
  it('should create a slugged export filename', () => {
    expect(getWebExportFilename('My Cool App')).toBe('my-cool-app-web-export.zip')
  })

  it('should package project files with manifest and ledger proof', async () => {
    const files = [
      { path: '/src/main.ts', content: 'console.log("ready")' },
    ]

    const ledgerEntries: LedgerEntry[] = [
      {
        id: 'ledger-1',
        phase: 'verify',
        label: 'Auditor verification passed',
        completedAt: Date.now(),
        proof: {
          auditorVerdict: 'passed',
        },
      },
    ]

    const blob = await createWebExportZip(files, {
      projectName: 'My Cool App',
      target: 'zip',
      ledgerEntries,
    })

    const blobWithArrayBuffer = blob as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> }
    const zipInput = typeof blobWithArrayBuffer.arrayBuffer === 'function'
      ? await blobWithArrayBuffer.arrayBuffer()
      : blob
    const zip = await JSZip.loadAsync(zipInput as Blob | ArrayBuffer)

    const source = await zip.file('src/main.ts')?.async('string')
    expect(source).toContain('console.log("ready")')
    expect(zip.file('README-DEPLOY.md')).toBeTruthy()

    const manifestRaw = await zip.file('.torbit/EXPORT_MANIFEST.json')?.async('string')
    const manifest = JSON.parse(manifestRaw ?? '{}') as { includesLedger?: boolean; target?: string }
    expect(manifest.includesLedger).toBe(true)
    expect(manifest.target).toBe('zip')

    const ledgerRaw = await zip.file('.torbit/ACTIVITY_LEDGER.json')?.async('string')
    const exportedLedger = JSON.parse(ledgerRaw ?? '[]') as LedgerEntry[]
    expect(exportedLedger[0]?.proof?.auditorVerdict).toBe('passed')
  })
})
