export type BuildFailureCategory = 'infra' | 'dependency' | 'code' | 'unknown'
export type BuildFailureStage = 'boot' | 'sync' | 'install' | 'runtime_start' | 'host_probe' | 'route_probe' | 'unknown'

export interface BuildFailure {
  category: BuildFailureCategory
  stage: BuildFailureStage
  command: string | null
  message: string
  exactLogLine: string
  actionableFix: string
  autoRecoveryAttempted: boolean
  autoRecoverySucceeded: boolean | null
}

interface ClassifyBuildFailureInput {
  message: string
  stage?: BuildFailureStage
  command?: string | null
  exactLogLine?: string
  autoRecoveryAttempted?: boolean
  autoRecoverySucceeded?: boolean | null
}

interface BuildFailureSummaryInput {
  goal: string
  fileCount: number
  failure: BuildFailure
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle))
}

export function isSandboxOwnershipFailure(message: string): boolean {
  const normalized = message.toLowerCase()
  return containsAny(normalized, [
    'sandbox ownership could not be verified',
    'sandbox_ownership_unverified',
    'sandbox does not belong to current user',
  ])
}

export function isRateLimitFailure(message: string): boolean {
  const normalized = message.toLowerCase()
  return containsAny(normalized, [
    'rate limit exceeded',
    'too many requests',
    'status code: 429',
    'retry-after',
  ])
}

export function classifyBuildFailure({
  message,
  stage = 'unknown',
  command = null,
  exactLogLine,
  autoRecoveryAttempted = false,
  autoRecoverySucceeded = null,
}: ClassifyBuildFailureInput): BuildFailure {
  const normalized = message.toLowerCase()

  let category: BuildFailureCategory = 'unknown'
  if (
    isRateLimitFailure(message) ||
    isSandboxOwnershipFailure(message) ||
    containsAny(normalized, ['forbidden', 'sandbox not found', 'e2b api error'])
  ) {
    category = 'infra'
  } else if (
    containsAny(normalized, [
      'dependency install failed',
      'npm install',
      'unable to resolve dependency tree',
      'enoent',
      'lockfile',
    ])
  ) {
    category = 'dependency'
  } else if (
    containsAny(normalized, [
      'dev server exited early',
      'dev server failed to start',
      'preview host not ready',
      'runtime route probe failed',
      'runtime validation failed',
      'route_probe_fail',
      'runtime_validation_fail',
      'empty-runtime-html',
      'build failed',
      'typescript',
      'eslint',
    ])
  ) {
    category = 'code'
  }

  const actionableFix = category === 'infra'
    ? (isSandboxOwnershipFailure(message)
      ? 'Recreate the sandbox and retry once. If it repeats, start a fresh build session.'
      : isRateLimitFailure(message)
        ? 'Retry after a short backoff. If it repeats, reduce sync burst size or increase server rate-limit capacity.'
      : 'Retry runtime setup with a fresh sandbox.')
    : category === 'dependency'
      ? 'Fix dependency issues in package.json/lockfile, then rerun `npm install`.'
      : category === 'code'
        ? 'Fix the runtime/build error in generated code, then rerun the dev server.'
        : 'Open the runtime log, capture the first failing line, and retry the build.'

  return {
    category,
    stage,
    command,
    message,
    exactLogLine: exactLogLine || message,
    actionableFix,
    autoRecoveryAttempted,
    autoRecoverySucceeded,
  }
}

function toCategoryLabel(category: BuildFailureCategory): string {
  switch (category) {
    case 'infra':
      return 'Infrastructure'
    case 'dependency':
      return 'Dependency'
    case 'code':
      return 'Code'
    default:
      return 'Unknown'
  }
}

function toStageLabel(stage: BuildFailureStage): string {
  switch (stage) {
    case 'boot':
      return 'environment startup'
    case 'sync':
      return 'workspace sync'
    case 'install':
      return 'dependency install'
    case 'runtime_start':
      return 'runtime startup'
    case 'host_probe':
      return 'preview availability check'
    case 'route_probe':
      return 'preview route validation'
    default:
      return 'execution'
  }
}

function toAutoRetryLine(failure: BuildFailure): string {
  if (!failure.autoRecoveryAttempted) return 'No'
  if (failure.autoRecoverySucceeded === true) return 'Yes (succeeded)'
  if (failure.autoRecoverySucceeded === false) return 'Yes (failed)'
  return 'Yes (in progress)'
}

export function formatBuildFailureSummary({
  goal,
  fileCount,
  failure,
}: BuildFailureSummaryInput): string {
  const fileLabel = fileCount === 1 ? 'file' : 'files'
  const categoryLabel = toCategoryLabel(failure.category)
  const stageLabel = toStageLabel(failure.stage)
  const commandLabel = failure.command ? `\`${failure.command}\`` : '`n/a`'
  const sanitizedExactLog = failure.exactLogLine
    .replace(/route_probe/gi, 'preview_route_validation')
    .replace(/host_probe/gi, 'preview_host_check')
    .replace(/runtime_start/gi, 'runtime_startup')

  return [
    '**Goal**',
    `- ${goal}`,
    '',
    '**What changed**',
    `- ${fileCount} ${fileLabel} were generated for this build.`,
    '',
    '**What passed**',
    '- File generation completed.',
    '',
    '**What failed**',
    `- ${categoryLabel} failure during ${stageLabel}.`,
    `- Command: ${commandLabel}`,
    `- Exact log: \`${sanitizedExactLog}\``,
    '',
    '**Auto-retry done?**',
    `- ${toAutoRetryLine(failure)}`,
    '',
    '**Next action**',
    `- ${failure.actionableFix}`,
  ].join('\n')
}
