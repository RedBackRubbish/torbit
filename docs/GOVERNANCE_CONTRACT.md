# TORBIT Governance Contract

> **Status:** FROZEN  
> **Last Updated:** February 5, 2026  
> **Authority:** This document supersedes code comments and README.

---

## Purpose

This contract defines immutable authority boundaries for all AI agents in TORBIT. Violations of these rules are bugs, not features.

---

## Agent Authority Matrix

| Agent | May Write Files | May Execute Commands | May Speak to User | Token Budget |
|-------|-----------------|---------------------|-------------------|--------------|
| **Strategist** | ❌ NO | ❌ NO | ❌ NO (internal only) | <10% |
| **Auditor** | ❌ NO | ❌ NO | ❌ NO (verdicts only) | <10% |
| **Planner** | ❌ NO | ❌ NO | ❌ NO | Bulk |
| **Architect** | ✅ YES | ✅ YES | ❌ NO | Bulk |
| **Frontend** | ✅ YES | ✅ YES | ❌ NO | Bulk |
| **Backend** | ✅ YES | ✅ YES | ❌ NO | Bulk |
| **DevOps** | ✅ YES | ✅ YES | ❌ NO | Bulk |
| **QA** | ✅ YES | ✅ YES | ❌ NO | Bulk |

---

## Immutable Rules

### 1. Strategist Contract
- **NEVER** the first mover on any task
- **NEVER** writes files or executes commands
- **ONLY** reviews plans created by Planner
- **ONLY** outputs structured verdicts: `APPROVED`, `REJECTED`, `NEEDS_REVISION`
- Called **after** Planner, **before** execution

### 2. Auditor Contract
- **NEVER** fixes code it judges
- **NEVER** writes files or executes commands
- **ONLY** reads and judges
- **ONLY** outputs structured verdicts: `PASSED`, `FAILED`, `NEEDS_WORK`
- If `FAILED`: Issues are surfaced, fuel is refunded, execution agents fix
- Called **after** execution, **before** finalization

### 3. Premium Model Budget
- GPT-5.2 (Strategist) + Claude Opus 4.5 (Auditor) combined: **<10% of total tokens**
- This is a hard ceiling, not a guideline
- If budget is exhausted, skip governance and log warning

### 4. Single Voice Rule
- **ONLY** Torbit speaks to users
- Agent names are **NEVER** shown in UI
- Model names are **NEVER** shown in UI
- Chain-of-thought is **NEVER** streamed to UI

---

## Nervous System Limits

Self-healing is bounded to prevent infinite loops:

| Error Class | Max Attempts | Then |
|-------------|--------------|------|
| DEPENDENCY_ERROR | 3 | Escalate to user |
| SYNTAX_ERROR | 3 | Escalate to QA |
| TYPE_ERROR | 3 | Escalate to QA |
| HYDRATION_ERROR | 2 | Escalate to user |
| BUILD_ERROR | 3 | Escalate to Planner |
| RUNTIME_ERROR | 3 | Escalate to user |

After max attempts, the system stops and surfaces the issue. Unbounded self-healing is a bug.

---

## Security Guarantees

1. **Secrets are never committed** to filesystem or terminal output
2. **Secrets are never echoed** in chat or logs
3. **API keys are server-side only** — never sent to client
4. **.env files are gitignored** and never read by agents

---

## Frozen Decisions

The following architectural decisions are **locked** and should not be changed without team review:

| Decision | Rationale |
|----------|-----------|
| Single voice UX | User trust, accountability |
| Auditor non-execution | Prevents infinite self-correction |
| Strategist non-first-mover | Prevents premature optimization |
| Premium model budget cap | Cost control, prevents model ego wars |
| Governance layer position | Must sit between orchestrator and executor |

---

## Violation Handling

If an agent violates this contract:

1. **Log the violation** with agent ID and action
2. **Abort the operation** — do not proceed
3. **Surface to user** as: "Something went wrong. Retrying."
4. **File a bug** — violations are code defects, not edge cases

---

## Amendment Process

To amend this contract:

1. Propose change in `docs/GOVERNANCE_PROPOSALS.md`
2. Review by at least 2 maintainers
3. Update this document with new date
4. Update corresponding code constraints
5. Notify team via commit message: `governance: [change summary]`

---

<p align="center">
  <em>This contract exists to keep Torbit calm, controlled, and trustworthy.</em>
</p>
