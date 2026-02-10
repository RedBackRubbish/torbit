# Torbit Schema (Supabase Postgres)

This project uses **Supabase Postgres only** for durable state.

## Core multi-tenant entities
- `profiles`: user profile + tier/fuel metadata, keyed by `auth.users.id`.
- `projects`: workspace-scoped project container (`user_id` owner).
- `project_collaborators`: shared project access (`owner|editor|viewer`).

## Conversation and execution
- `conversations`: chat threads per project/user.
- `messages`: user/assistant/system chat messages.
- `background_runs`: durable async jobs with retry metadata (`attempt_count`, `max_attempts`, `next_retry_at`, `cancel_requested`).
- `project_presence`: real-time collaboration heartbeat (`status`, `cursor`, `heartbeat_at`).

## Governance and observability
- `audit_events`: immutable governance/audit trail.
- `product_events`: product telemetry events.
- `supervisor_event_ledger`: run-level supervisor stream ledger for orchestration transparency.
  - event types: `run_started`, `intent_classified`, `route_selected`, `gate_started`, `gate_passed`, `gate_failed`, `autofix_started`, `autofix_succeeded`, `autofix_failed`, `fallback_invoked`, `run_completed`.

## Billing
- `fuel_transactions` (core schema) and billing extension tables in `supabase/billing-schema.sql`.

## Migrations
- Base schema: `supabase/schema.sql`
- Billing extension: `supabase/billing-schema.sql`
- Supervisor ledger migration: `supabase/migrations/20260210180000_supervisor_event_ledger.sql`

## Security model
- RLS enabled on all user-facing tables.
- Ownership/collaborator checks on project-scoped rows.
- Background and supervisor event rows are constrained to accessible projects.
