import { describe, expect, it } from 'vitest'
import { detectVerticalPlaybook, getVerticalPlaybookGuidance } from './playbooks'

describe('vertical playbooks', () => {
  it('detects internal ops prompts', () => {
    const playbook = detectVerticalPlaybook('Build an internal tool admin panel with RBAC')
    expect(playbook?.id).toBe('internal-ops')
  })

  it('detects compliance prompts', () => {
    const playbook = detectVerticalPlaybook('Create a SOC2 compliance and audit trail portal')
    expect(playbook?.id).toBe('compliance-portal')
  })

  it('detects analytics prompts', () => {
    const playbook = detectVerticalPlaybook('Need a KPI analytics dashboard with timeseries charts')
    expect(playbook?.id).toBe('analytics-workspace')
  })

  it('returns null when no playbook matches', () => {
    const playbook = detectVerticalPlaybook('Build a static homepage')
    expect(playbook).toBeNull()
  })

  it('returns formatted guidance for matching prompts', () => {
    const guidance = getVerticalPlaybookGuidance('Build a compliance portal for audit')
    expect(guidance).toContain('VERTICAL PLAYBOOK DETECTED')
    expect(guidance).toContain('PLAYBOOK: COMPLIANCE PORTAL')
  })
})
