import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { VibeAuditReport } from '@/lib/vibe-audit'

export interface VibeAutofixResult {
  applied: string[]
  skipped: string[]
}

async function ensureFile(filePath: string, content: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return false
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf8')
    return true
  }
}

const APP_LOADING_FILE = `export default function Loading() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border border-white/30 border-t-white animate-spin" aria-label="Loading" />
    </main>
  )
}
`

const APP_NOT_FOUND_FILE = `import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-md text-center space-y-4">
        <p className="text-xs tracking-[0.2em] uppercase text-white/40">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-white/65">The requested route does not exist in this workspace.</p>
        <Link href="/" className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/[0.04] px-4 py-2 text-sm text-white/85 hover:bg-white/[0.08] transition-colors">
          Back to home
        </Link>
      </div>
    </main>
  )
}
`

const PRIVACY_PAGE_FILE = `export const metadata = {
  title: 'Privacy | Torbit',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-white/70">
          Torbit stores only data required to operate your workspace, run supervised builds, and protect account security.
        </p>
        <p className="text-white/70">
          We do not sell personal data. Data retention and deletion follow workspace-level controls and legal requirements.
        </p>
      </div>
    </main>
  )
}
`

const TERMS_PAGE_FILE = `export const metadata = {
  title: 'Terms | Torbit',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="text-white/70">
          Torbit services are provided as-is for software development workflows subject to applicable law.
        </p>
        <p className="text-white/70">
          You are responsible for code review, production approvals, and compliance obligations in your organization.
        </p>
      </div>
    </main>
  )
}
`

function hasFinding(report: VibeAuditReport, findingId: string): boolean {
  return report.findings.some((finding) => finding.id === findingId && finding.status !== 'verified')
}

export async function runVibeAutofix(projectRoot: string, report: VibeAuditReport): Promise<VibeAutofixResult> {
  const applied: string[] = []
  const skipped: string[] = []

  if (hasFinding(report, 'resilience')) {
    const loadingFile = path.join(projectRoot, 'src/app/loading.tsx')
    if (await ensureFile(loadingFile, APP_LOADING_FILE)) {
      applied.push('Added src/app/loading.tsx')
    } else {
      skipped.push('src/app/loading.tsx already exists')
    }

    const notFoundFile = path.join(projectRoot, 'src/app/not-found.tsx')
    if (await ensureFile(notFoundFile, APP_NOT_FOUND_FILE)) {
      applied.push('Added src/app/not-found.tsx')
    } else {
      skipped.push('src/app/not-found.tsx already exists')
    }
  }

  if (hasFinding(report, 'legal')) {
    const privacyFile = path.join(projectRoot, 'src/app/privacy/page.tsx')
    if (await ensureFile(privacyFile, PRIVACY_PAGE_FILE)) {
      applied.push('Added src/app/privacy/page.tsx')
    } else {
      skipped.push('src/app/privacy/page.tsx already exists')
    }

    const termsFile = path.join(projectRoot, 'src/app/terms/page.tsx')
    if (await ensureFile(termsFile, TERMS_PAGE_FILE)) {
      applied.push('Added src/app/terms/page.tsx')
    } else {
      skipped.push('src/app/terms/page.tsx already exists')
    }
  }

  if (hasFinding(report, 'context-rot')) {
    skipped.push('Oversized-file refactors require targeted module decomposition')
  }

  if (hasFinding(report, 'secrets')) {
    skipped.push('Potential secret exposure requires manual review before mutation')
  }

  if (hasFinding(report, 'database')) {
    skipped.push('Database storage strategy changes are not auto-patched')
  }

  return { applied, skipped }
}
