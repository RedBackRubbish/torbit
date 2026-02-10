# Torbit Operations

## Canary Smoke + Rollback

`/.github/workflows/canary-smoke.yml` runs after every push to `main` and can be launched manually.

The workflow script is `scripts/canary-smoke-and-rollback.sh`.

Required GitHub repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`

Optional secrets:

- `VERCEL_SCOPE`

Behavior:

1. Poll latest production deployment until `READY`.
2. Run smoke specs against that deployed URL.
3. If smoke fails, run `vercel rollback` to the previous ready deployment URL.

## Workspace SLO Metrics

`GET /api/metrics/summary?projectId=<uuid>&days=<n>` now includes:

- `summary.slo.chatReplyLatencyP50Ms`
- `summary.slo.chatReplyLatencySamples`
- `summary.slo.chatNoReplyRate`
- `summary.slo.api404Rate`
- `summary.slo.api500Rate`
- `summary.slo.presence404Rate`
- `summary.slo.presence500Rate`
- `summary.slo.backgroundRuns404Rate`
- `summary.slo.backgroundRuns500Rate`

These are sourced from product events emitted by chat runtime telemetry and presence/background hooks.
