import type { LedgerEntry } from '@/store/ledger'

export interface WebExportFile {
  path: string
  content: string
}

export interface WebExportOptions {
  projectName: string
  target?: 'zip' | 'vercel' | 'netlify' | 'github'
  ledgerEntries?: LedgerEntry[]
}

interface ExportManifest {
  version: string
  projectName: string
  target: string
  exportedAt: string
  fileCount: number
  includesLedger: boolean
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path
}

function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'torbit-project'
}

function createDeployReadme(projectName: string): string {
  return `# Deploy ${projectName}

## Quick Start

1. Install dependencies: \`npm install\`
2. Run locally: \`npm run dev\`
3. Commit to GitHub
4. Import the repository into Vercel or Netlify

## Environment

Copy \`.env.example\` to \`.env.local\` and fill required keys before production deploy.

## Proof

This export includes TORBIT metadata in \`.torbit/\`.
`
}

function createManifest(options: {
  projectName: string
  target: string
  fileCount: number
  includesLedger: boolean
}): ExportManifest {
  return {
    version: '1.0.0',
    projectName: options.projectName,
    target: options.target,
    exportedAt: new Date().toISOString(),
    fileCount: options.fileCount,
    includesLedger: options.includesLedger,
  }
}

export function getWebExportFilename(projectName: string): string {
  return `${toSlug(projectName)}-web-export.zip`
}

export async function createWebExportZip(
  files: WebExportFile[],
  options: WebExportOptions
): Promise<Blob> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  const cleanFiles = files.filter((file) => file.path && typeof file.content === 'string')
  cleanFiles.forEach((file) => {
    zip.file(normalizePath(file.path), file.content)
  })

  const hasDeployReadme = cleanFiles.some((file) => normalizePath(file.path).toLowerCase() === 'readme-deploy.md')
  if (!hasDeployReadme) {
    zip.file('README-DEPLOY.md', createDeployReadme(options.projectName))
  }

  const ledgerEntries = options.ledgerEntries ?? []
  const manifest = createManifest({
    projectName: options.projectName,
    target: options.target ?? 'zip',
    fileCount: cleanFiles.length,
    includesLedger: ledgerEntries.length > 0,
  })

  zip.file('.torbit/EXPORT_MANIFEST.json', JSON.stringify(manifest, null, 2))
  if (ledgerEntries.length > 0) {
    zip.file('.torbit/ACTIVITY_LEDGER.json', JSON.stringify(ledgerEntries, null, 2))
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  })
}

export function downloadWebExportBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
