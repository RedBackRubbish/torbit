import { describe, expect, it } from 'vitest'
import {
  classifyBuildFailure,
  formatBuildFailureSummary,
  isSandboxOwnershipFailure,
} from './build-diagnostics'

describe('build diagnostics', () => {
  it('detects sandbox ownership failures', () => {
    expect(isSandboxOwnershipFailure('Forbidden: sandbox ownership could not be verified')).toBe(true)
    expect(isSandboxOwnershipFailure('Dependency install failed')).toBe(false)
  })

  it('classifies dependency install failures and keeps command context', () => {
    const failure = classifyBuildFailure({
      message: 'Dependency install failed: npm ERR! ERESOLVE unable to resolve dependency tree',
      stage: 'install',
      command: 'npm install',
      exactLogLine: 'Build error: Dependency install failed: npm ERR! ERESOLVE unable to resolve dependency tree',
    })

    expect(failure.category).toBe('dependency')
    expect(failure.command).toBe('npm install')
    expect(failure.actionableFix).toContain('npm install')
  })

  it('classifies runtime ownership errors as infra', () => {
    const failure = classifyBuildFailure({
      message: 'Sync error: Forbidden: sandbox ownership could not be verified',
      stage: 'sync',
      command: 'syncFilesToSandbox',
      autoRecoveryAttempted: true,
      autoRecoverySucceeded: false,
    })

    expect(failure.category).toBe('infra')
    expect(failure.autoRecoveryAttempted).toBe(true)
    expect(failure.autoRecoverySucceeded).toBe(false)
  })

  it('formats a structured failure summary for chat output', () => {
    const failure = classifyBuildFailure({
      message: 'Dev server exited early: next build failed',
      stage: 'runtime_start',
      command: 'npm run dev -- --hostname 0.0.0.0 --port 3000',
      exactLogLine: 'Build error: Dev server exited early: next build failed',
      autoRecoveryAttempted: true,
      autoRecoverySucceeded: false,
    })

    const summary = formatBuildFailureSummary({
      goal: 'Build preview runtime',
      fileCount: 12,
      failure,
    })

    expect(summary).toContain('**Goal**')
    expect(summary).toContain('**What changed**')
    expect(summary).toContain('**What passed**')
    expect(summary).toContain('**What failed**')
    expect(summary).toContain('**Auto-retry done?**')
    expect(summary).toContain('**Next action**')
    expect(summary).toContain('`npm run dev -- --hostname 0.0.0.0 --port 3000`')
    expect(summary).toContain('Build error: Dev server exited early: next build failed')
  })
})
