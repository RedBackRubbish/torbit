import { promises as fs } from 'node:fs'
import path from 'node:path'

type ProofStatus = 'verified' | 'warning' | 'failed'

export interface VibeAuditFinding {
  id: 'database' | 'secrets' | 'context-rot' | 'resilience' | 'legal'
  status: ProofStatus
  label: string
  detail: string
  remediation: string
}

export interface VibeAuditReport {
  findings: VibeAuditFinding[]
  proof: Array<{ label: string; status: ProofStatus }>
  guardrailPrompt: string
}

export interface VibeAuditSnapshotFile {
  path: string
  content: string
}

const IGNORED_DIRS = new Set([
  '.git',
  '.next',
  'node_modules',
  'coverage',
  'dist',
  'build',
  'storybook-static',
  '.vercel',
])

const MAX_DEPTH = 8
const MAX_FILES = 1200
const LARGE_FILE_LINE_THRESHOLD = 220

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readTextIfExists(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

async function collectFiles(rootDir: string): Promise<string[]> {
  const files: string[] = []

  const walk = async (dirPath: string, depth: number): Promise<void> => {
    if (depth > MAX_DEPTH || files.length >= MAX_FILES) return

    let entries: Array<import('node:fs').Dirent>
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) break
      const absolutePath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue
        await walk(absolutePath, depth + 1)
        continue
      }

      if (!entry.isFile()) continue
      files.push(absolutePath)
    }
  }

  await walk(rootDir, 0)
  return files
}

function getClientScope(filePath: string): boolean {
  const normalized = normalizePath(filePath)
  return (
    normalized.includes('/src/components/') ||
    normalized.includes('/src/app/') ||
    normalized.includes('/src/pages/')
  )
}

function buildGuardrailPrompt(findings: VibeAuditFinding[]): string {
  const warnings = findings.filter((finding) => finding.status !== 'verified')
  if (warnings.length === 0) {
    return ''
  }

  const steps = warnings
    .map((warning, index) => `${index + 1}. ${warning.label}: ${warning.remediation}`)
    .join('\n')

  return [
    '## AUTOMATIC SAFETY GUARDRAILS',
    'You must satisfy these checks before finishing this run:',
    steps,
    'If already compliant, explicitly state verification in your final summary.',
  ].join('\n')
}

function createReport(findings: VibeAuditFinding[]): VibeAuditReport {
  return {
    findings,
    proof: findings.map((finding) => ({
      label: `${finding.label}: ${finding.detail}`,
      status: finding.status,
    })),
    guardrailPrompt: buildGuardrailPrompt(findings),
  }
}

export function runVibeAuditOnSnapshot(
  snapshotFiles: VibeAuditSnapshotFile[],
  options?: { envContents?: string }
): VibeAuditReport {
  const findings: VibeAuditFinding[] = []
  const normalizedSnapshot = snapshotFiles.map((file) => ({
    path: normalizePath(file.path.replace(/^\/+/, '')),
    content: file.content || '',
  }))
  const normalizedPaths = normalizedSnapshot.map((file) => file.path)
  const envContents = options?.envContents || ''

  // 1) Vanishing database trap.
  const sqliteEnvDetected = /DATABASE_URL\s*=\s*["']?(sqlite|file:)/i.test(envContents)
  const sqliteFiles = normalizedPaths.filter((filePath) => /\.(sqlite|db)$/i.test(filePath))
  const sqliteConfigMention = normalizedSnapshot.some(({ path: filePath, content }) => (
    /(prisma|drizzle|database|db)/i.test(filePath) &&
    /(sqlite|better-sqlite3|file:\.?\/.*\.db|libsql)/i.test(content)
  ))
  const sqliteRiskDetected = sqliteEnvDetected || sqliteFiles.length > 0 || sqliteConfigMention

  if (sqliteRiskDetected) {
    findings.push({
      id: 'database',
      status: 'warning',
      label: 'Database durability risk',
      detail: 'SQLite/local-file persistence indicators detected in deploy snapshot.',
      remediation: 'Migrate persistent data to Supabase/Postgres/Neon and keep DATABASE_URL on managed storage.',
    })
  } else {
    findings.push({
      id: 'database',
      status: 'verified',
      label: 'Database durability',
      detail: 'No SQLite/local DB indicator found in deploy snapshot.',
      remediation: 'Keep using managed Postgres-class storage for production.',
    })
  }

  // 2) Open wallet mistake.
  const clientCandidates = normalizedSnapshot.filter(({ path: filePath }) => (
    /\.(ts|tsx|js|jsx)$/i.test(filePath) && getClientScope(`/${filePath}`)
  ))
  const hardcodedSecretPatterns = [
    /sk-(proj|live|test|ant-|or-v1)[A-Za-z0-9_\-]{12,}/,
    /AIza[0-9A-Za-z_\-]{20,}/,
    /ghp_[A-Za-z0-9]{20,}/,
  ]
  const exposedServerEnvPattern = /process\.env\.(?!NEXT_PUBLIC)[A-Z0-9_]+/

  const secretHits = new Set<string>()
  for (const { path: filePath, content } of clientCandidates) {
    const hasLiteralSecret = hardcodedSecretPatterns.some((pattern) => pattern.test(content))
    const hasServerEnvUsage = exposedServerEnvPattern.test(content)
    if (hasLiteralSecret || hasServerEnvUsage) {
      secretHits.add(filePath)
    }
  }

  if (secretHits.size > 0) {
    const sample = Array.from(secretHits).slice(0, 3).join(', ')
    findings.push({
      id: 'secrets',
      status: 'warning',
      label: 'Client secret exposure risk',
      detail: `Potential secret exposure in client-facing code (${sample}${secretHits.size > 3 ? ', ...' : ''}).`,
      remediation: 'Move secrets to server-only env vars and route all secret-bearing calls through API routes.',
    })
  } else {
    findings.push({
      id: 'secrets',
      status: 'verified',
      label: 'Client secret exposure',
      detail: 'No obvious hardcoded secret or server-only env usage in client scope.',
      remediation: 'Continue enforcing server-only secret access.',
    })
  }

  // 3) Goldfish memory/context rot.
  const largeFiles = normalizedSnapshot
    .filter(({ path: filePath }) => /\.(ts|tsx|js|jsx)$/i.test(filePath))
    .map(({ path: filePath, content }) => ({
      file: filePath,
      lines: content.split('\n').length,
    }))
    .filter((entry) => entry.lines > LARGE_FILE_LINE_THRESHOLD)

  if (largeFiles.length > 0) {
    largeFiles.sort((a, b) => b.lines - a.lines)
    const top = largeFiles.slice(0, 3).map((entry) => `${entry.file} (${entry.lines} lines)`).join(', ')
    findings.push({
      id: 'context-rot',
      status: 'warning',
      label: 'Context rot risk',
      detail: `${largeFiles.length} oversized file(s) detected; largest: ${top}.`,
      remediation: 'Refactor oversized files into focused modules/components; target <= 200 lines per file.',
    })
  } else {
    findings.push({
      id: 'context-rot',
      status: 'verified',
      label: 'Context rot',
      detail: `No file exceeds ${LARGE_FILE_LINE_THRESHOLD} lines.`,
      remediation: 'Keep modules small to avoid degraded generation quality.',
    })
  }

  // 4) White screen of death.
  const hasAppError = normalizedPaths.some((filePath) => filePath === 'src/app/error.tsx')
  const hasAppLoading = normalizedPaths.some((filePath) => filePath === 'src/app/loading.tsx')
  const routeLoadingCount = normalizedPaths.filter((filePath) => /\/loading\.tsx$/.test(filePath)).length
  const resilienceOk = hasAppError && (hasAppLoading || routeLoadingCount > 0)

  if (!resilienceOk) {
    findings.push({
      id: 'resilience',
      status: 'warning',
      label: 'Resilience UX risk',
      detail: `Fallback coverage incomplete (error boundary: ${hasAppError ? 'yes' : 'no'}, loading state: ${hasAppLoading || routeLoadingCount > 0 ? 'yes' : 'no'}).`,
      remediation: 'Add app-level error.tsx plus loading.tsx (or route-level loading states) for all async surfaces.',
    })
  } else {
    findings.push({
      id: 'resilience',
      status: 'verified',
      label: 'Resilience UX',
      detail: 'Error boundary and loading-state coverage detected.',
      remediation: 'Keep fallback UX in place for every network/data path.',
    })
  }

  // 5) Legal landmine.
  const hasPrivacyPage = normalizedPaths.some((filePath) => (
    filePath === 'src/app/privacy/page.tsx' ||
    filePath === 'src/pages/privacy.tsx' ||
    filePath === 'src/pages/privacy.jsx'
  ))

  if (!hasPrivacyPage) {
    findings.push({
      id: 'legal',
      status: 'warning',
      label: 'Legal/privacy risk',
      detail: 'No privacy policy route detected.',
      remediation: 'Add a standard privacy policy page at /privacy and link it from footer/auth/payment screens.',
    })
  } else {
    findings.push({
      id: 'legal',
      status: 'verified',
      label: 'Legal/privacy baseline',
      detail: 'Privacy route detected.',
      remediation: 'Keep policy updated with analytics, payments, and retention details.',
    })
  }

  return createReport(findings)
}

export async function runVibeAudit(projectRoot: string): Promise<VibeAuditReport> {
  const findings: VibeAuditFinding[] = []
  const allFiles = await collectFiles(projectRoot)
  const normalizedFiles = allFiles.map((filePath) => normalizePath(filePath))

  // 1) Vanishing database trap: SQLite/local file DB in hosted setup.
  const envContents = [
    await readTextIfExists(path.join(projectRoot, '.env')),
    await readTextIfExists(path.join(projectRoot, '.env.local')),
  ].join('\n')

  const sqliteEnvDetected = /DATABASE_URL\s*=\s*["']?(sqlite|file:)/i.test(envContents)
  const sqliteFiles = normalizedFiles.filter((filePath) => /\.(sqlite|db)$/i.test(filePath))
  const sqliteMentionFiles = normalizedFiles.filter((filePath) => /(schema\.prisma|drizzle|database|db)/i.test(filePath))
  const sqliteRiskDetected = sqliteEnvDetected || sqliteFiles.length > 0

  if (sqliteRiskDetected) {
    findings.push({
      id: 'database',
      status: 'warning',
      label: 'Database durability risk',
      detail: `SQLite/local DB markers detected (${Math.max(sqliteFiles.length, 1)} indicator${Math.max(sqliteFiles.length, 1) === 1 ? '' : 's'}).`,
      remediation: 'Migrate persistent data to Supabase/Postgres/Neon and keep DATABASE_URL on managed storage.',
    })
  } else {
    findings.push({
      id: 'database',
      status: 'verified',
      label: 'Database durability',
      detail: sqliteMentionFiles.length > 0
        ? 'No SQLite/local DB indicator found in env/files.'
        : 'No obvious local-file database indicator found.',
      remediation: 'Keep using managed Postgres-class storage for production.',
    })
  }

  // 2) Open wallet mistake: secret leakage in client-side code.
  const clientCandidates = allFiles.filter((filePath) => (
    /\.(ts|tsx|js|jsx)$/i.test(filePath) && getClientScope(filePath)
  ))
  const hardcodedSecretPatterns = [
    /sk-(proj|live|test|ant-|or-v1)[A-Za-z0-9_\-]{12,}/,
    /AIza[0-9A-Za-z_\-]{20,}/,
    /ghp_[A-Za-z0-9]{20,}/,
  ]
  const exposedServerEnvPattern = /process\.env\.(?!NEXT_PUBLIC)[A-Z0-9_]+/

  const secretHits = new Set<string>()
  for (const filePath of clientCandidates) {
    const content = await readTextIfExists(filePath)
    const hasLiteralSecret = hardcodedSecretPatterns.some((pattern) => pattern.test(content))
    const hasServerEnvUsage = exposedServerEnvPattern.test(content)
    if (hasLiteralSecret || hasServerEnvUsage) {
      secretHits.add(normalizePath(path.relative(projectRoot, filePath)))
    }
  }

  if (secretHits.size > 0) {
    const sample = Array.from(secretHits).slice(0, 3).join(', ')
    findings.push({
      id: 'secrets',
      status: 'warning',
      label: 'Client secret exposure risk',
      detail: `Potential secret exposure in client-facing code (${sample}${secretHits.size > 3 ? ', ...' : ''}).`,
      remediation: 'Move secrets to server-only env vars and route all secret-bearing calls through API routes.',
    })
  } else {
    findings.push({
      id: 'secrets',
      status: 'verified',
      label: 'Client secret exposure',
      detail: 'No obvious hardcoded secret or server-only env usage in client scope.',
      remediation: 'Continue enforcing server-only secret access.',
    })
  }

  // 3) Goldfish memory/context rot: oversized files.
  const largeFiles: Array<{ file: string; lines: number }> = []
  for (const filePath of allFiles) {
    if (!/\.(ts|tsx|js|jsx)$/i.test(filePath)) continue
    const content = await readTextIfExists(filePath)
    const lineCount = content.split('\n').length
    if (lineCount > LARGE_FILE_LINE_THRESHOLD) {
      largeFiles.push({
        file: normalizePath(path.relative(projectRoot, filePath)),
        lines: lineCount,
      })
    }
  }

  if (largeFiles.length > 0) {
    largeFiles.sort((a, b) => b.lines - a.lines)
    const top = largeFiles.slice(0, 3).map((entry) => `${entry.file} (${entry.lines} lines)`).join(', ')
    findings.push({
      id: 'context-rot',
      status: 'warning',
      label: 'Context rot risk',
      detail: `${largeFiles.length} oversized file(s) detected; largest: ${top}.`,
      remediation: 'Refactor oversized files into focused modules/components; target <= 200 lines per file.',
    })
  } else {
    findings.push({
      id: 'context-rot',
      status: 'verified',
      label: 'Context rot',
      detail: `No file exceeds ${LARGE_FILE_LINE_THRESHOLD} lines.`,
      remediation: 'Keep modules small to avoid degraded generation quality.',
    })
  }

  // 4) White screen of death: missing loading/error fallback UX.
  const hasAppError = await fileExists(path.join(projectRoot, 'src/app/error.tsx'))
  const hasAppLoading = await fileExists(path.join(projectRoot, 'src/app/loading.tsx'))
  const routeLoadingCount = normalizedFiles.filter((filePath) => /\/loading\.tsx$/.test(filePath)).length
  const resilienceOk = hasAppError && (hasAppLoading || routeLoadingCount > 0)

  if (!resilienceOk) {
    findings.push({
      id: 'resilience',
      status: 'warning',
      label: 'Resilience UX risk',
      detail: `Fallback coverage incomplete (error boundary: ${hasAppError ? 'yes' : 'no'}, loading state: ${hasAppLoading || routeLoadingCount > 0 ? 'yes' : 'no'}).`,
      remediation: 'Add app-level error.tsx plus loading.tsx (or route-level loading states) for all async surfaces.',
    })
  } else {
    findings.push({
      id: 'resilience',
      status: 'verified',
      label: 'Resilience UX',
      detail: 'Error boundary and loading-state coverage detected.',
      remediation: 'Keep fallback UX in place for every network/data path.',
    })
  }

  // 5) Legal landmine: privacy page/policy.
  const hasPrivacyPage = (
    await fileExists(path.join(projectRoot, 'src/app/privacy/page.tsx')) ||
    await fileExists(path.join(projectRoot, 'src/pages/privacy.tsx')) ||
    await fileExists(path.join(projectRoot, 'src/pages/privacy.jsx'))
  )

  if (!hasPrivacyPage) {
    findings.push({
      id: 'legal',
      status: 'warning',
      label: 'Legal/privacy risk',
      detail: 'No privacy policy route detected.',
      remediation: 'Add a standard privacy policy page at /privacy and link it from footer/auth/payment screens.',
    })
  } else {
    findings.push({
      id: 'legal',
      status: 'verified',
      label: 'Legal/privacy baseline',
      detail: 'Privacy route detected.',
      remediation: 'Keep policy updated with analytics, payments, and retention details.',
    })
  }

  return createReport(findings)
}
