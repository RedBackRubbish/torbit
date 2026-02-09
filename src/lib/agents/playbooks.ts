export type VerticalPlaybookId =
  | 'internal-ops'
  | 'compliance-portal'
  | 'analytics-workspace'

interface VerticalPlaybook {
  id: VerticalPlaybookId
  name: string
  match: RegExp
  guidance: string
}

const PLAYBOOKS: VerticalPlaybook[] = [
  {
    id: 'internal-ops',
    name: 'Internal Ops',
    match: /\b(internal tool|backoffice|admin panel|ops dashboard|operations console|rbac)\b/i,
    guidance: `PLAYBOOK: INTERNAL OPS
- Prefer secure defaults: auth required for all non-public routes.
- Include role model (admin, operator, viewer) and guard server routes.
- Include searchable data table, detail drawer, and action audit trail.
- Add robust empty/loading/error states for all operator workflows.
- Prioritize keyboard-first workflows (quick filter, command palette, hotkeys).`,
  },
  {
    id: 'compliance-portal',
    name: 'Compliance Portal',
    match: /\b(compliance|audit trail|soc ?2|hipaa|gdpr|governance|attestation)\b/i,
    guidance: `PLAYBOOK: COMPLIANCE PORTAL
- Include immutable event ledger view with filter by actor, action, timestamp.
- Include evidence bundle section with signed hash metadata and export controls.
- Model policy status explicitly (pass, warning, blocked) with rationale.
- Require explicit confirmation on policy overrides and track approver identity.
- Prefer deterministic checks over vague LLM-only assertions.`,
  },
  {
    id: 'analytics-workspace',
    name: 'Analytics Workspace',
    match: /\b(analytics|metrics dashboard|kpi|reporting|funnel|cohort|timeseries)\b/i,
    guidance: `PLAYBOOK: ANALYTICS WORKSPACE
- Include KPI header with period selector and trend delta states.
- Include drill-down table linked from chart selections.
- Include caching/loading strategy for expensive queries.
- Include CSV export and saved-view presets.
- Include data freshness indicator and last-updated timestamp.`,
  },
]

export function detectVerticalPlaybook(prompt: string): VerticalPlaybook | null {
  const normalized = prompt.trim()
  if (!normalized) return null

  for (const playbook of PLAYBOOKS) {
    if (playbook.match.test(normalized)) {
      return playbook
    }
  }

  return null
}

export function getVerticalPlaybookGuidance(prompt: string): string | null {
  const playbook = detectVerticalPlaybook(prompt)
  if (!playbook) return null

  return `## VERTICAL PLAYBOOK DETECTED
- Name: ${playbook.name}
- ID: ${playbook.id}

${playbook.guidance}`
}
