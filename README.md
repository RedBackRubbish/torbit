# TORBIT Operator Runbook

Last updated: February 8, 2026.

Torbit is a governed AI build workspace with:
- AI builder chat + tool execution
- persistent state and checkpoint replay
- atomic rollback (files + DB state + deployment config)
- trust layer approvals + signed audit bundle records
- mobile shipping pipeline (TestFlight, App Store Connect, Android)
- collaboration baseline (presence + background runs)

## 1. Bootstrap

```bash
cd /Users/tj/Desktop/torbit
pnpm install
cp .env.example .env
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## 2. Environment Setup (By Workflow)

Use `/Users/tj/Desktop/torbit/.env.example` as the source template.

### Minimal `.env` (copy/paste)

Use this when you want the fastest path to run core app + mobile pipeline + trust signing.

```env
# Core
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Pick at least one AI provider
OPENAI_API_KEY=your_openai_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# Mobile pipeline
EXPO_TOKEN=your_expo_token

# iOS submit auth (choose one path)
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
# ASC_API_KEY_ID=AB12C3D4E5
# ASC_API_KEY_ISSUER_ID=00000000-0000-0000-0000-000000000000
# ASC_API_KEY_PATH=/absolute/path/AuthKey_AB12C3D4E5.p8

# Android submit auth (choose one path)
GOOGLE_SERVICE_ACCOUNT_JSON=/absolute/path/google-service-account.json
# GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/absolute/path/google-service-account.json
# EXPO_ANDROID_SERVICE_ACCOUNT_KEY_PATH=/absolute/path/google-service-account.json

# Trust signing
TORBIT_AUDIT_SIGNING_SECRET=replace_with_long_random_secret
TORBIT_AUDIT_SIGNING_KEY_ID=torbit-default

# Server/admin routes that require privileged DB access
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Core app + chat (required)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- one model provider key:
  - `OPENAI_API_KEY` or
  - `ANTHROPIC_API_KEY` or
  - `GOOGLE_GENERATIVE_AI_API_KEY`

### Mobile pipeline (required for TestFlight/App Store/Android)

- `EXPO_TOKEN`
- iOS auth (choose one path):
  - `APPLE_APP_SPECIFIC_PASSWORD` (or `EXPO_APPLE_APP_SPECIFIC_PASSWORD`)
  - App Store Connect API trio:
    - `ASC_API_KEY_ID`
    - `ASC_API_KEY_ISSUER_ID`
    - `ASC_API_KEY_PATH`
    - optional aliases: `EXPO_ASC_API_KEY_ID`, `EXPO_ASC_API_KEY_ISSUER_ID`, `EXPO_ASC_API_KEY_PATH`
- Android auth (choose one path):
  - `GOOGLE_SERVICE_ACCOUNT_JSON`
  - or `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`
  - or `EXPO_ANDROID_SERVICE_ACCOUNT_KEY_PATH`

### Trust layer signature (required for signed audit bundles)

- `TORBIT_AUDIT_SIGNING_SECRET`
- optional `TORBIT_AUDIT_SIGNING_KEY_ID` (defaults to `torbit-default`)
- legacy alias still accepted: `TORBIT_SIGNING_SECRET`

### Optional shipping integrations

- GitHub: `GITHUB_TOKEN` (+ optional `GITHUB_OWNER`)
- Vercel: `VERCEL_TOKEN` (+ optional `VERCEL_TEAM_ID`, `VERCEL_TEAM_SLUG`)
- Netlify: `NETLIFY_TOKEN` (+ optional `NETLIFY_SITE_ID`)

### Optional billing routes

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_TEAM_MONTHLY`
- `STRIPE_PRICE_FUEL_500`
- `STRIPE_PRICE_FUEL_2500`
- `STRIPE_PRICE_FUEL_10000`

### Optional runtime paths

- `TORBIT_DATA_DIR` (default: `./.torbit-data`)
- `TORBIT_WORKER_TOKEN` (worker token for `/api/background-runs/dispatch` and `/api/background-runs/worker`)
- `CRON_SECRET` (optional Vercel Cron bearer token; supported by `/api/background-runs/worker`)
- `UPSTASH_REDIS_REST_URL` (optional distributed rate limiting backend)
- `UPSTASH_REDIS_REST_TOKEN` (optional distributed rate limiting backend token)

## 3. Database Migration

Before collaboration/background features, apply:
- `/Users/tj/Desktop/torbit/supabase/schema.sql`

Key added tables:
- `project_collaborators`
- `project_presence`
- `background_runs`

## 4. Smoke Test Checklist

Run after env + schema setup:

```bash
cd /Users/tj/Desktop/torbit
pnpm exec tsc --noEmit
pnpm lint
pnpm test:run
```

Manual product smoke:
1. Open builder and send a chat prompt.
2. Confirm project reload resumes from checkpoint.
3. In publish panel, run diagnostics for mobile pipeline.
4. Trigger a TestFlight/App Store/Android action and verify background run record updates.
5. Complete trust approval flow and confirm signed bundle appears in governance UI.

## 5. Operational API Endpoints

- `POST /api/chat`
- `POST /api/ship/mobile`
- `GET /api/ship/mobile` (pipeline diagnostics)
- `GET/POST /api/background-runs`
- `GET/PATCH /api/background-runs/[runId]`
- `POST /api/background-runs/dispatch`
- `GET/POST /api/background-runs/worker` (token-auth worker/cron dispatcher + stale-run watchdog)
- `POST /api/governance/sign-bundle`
- `POST /api/ship/github`
- `POST /api/ship/deploy`

## 6. Common Failures

### Mobile action blocked

Check:
- `EXPO_TOKEN` is set
- iOS or Android submit credentials are present for the selected action
- project payload includes required mobile files (`app.json`, `package.json`, `eas.json` is auto-merged if missing)

### Signed bundle creation fails

Check:
- `TORBIT_AUDIT_SIGNING_SECRET` (or `TORBIT_SIGNING_SECRET`) is set
- request is authenticated

### Collaboration/presence/background runs do not update

Check:
- latest `/Users/tj/Desktop/torbit/supabase/schema.sql` has been applied
- RLS policies exist and the user is authenticated
- Supabase realtime is enabled for relevant tables
- queued runs can be manually dispatched via `POST /api/background-runs/dispatch`
- worker token auth is set (`TORBIT_WORKER_TOKEN` or `CRON_SECRET`)
- Vercel cron path `/api/background-runs/worker` exists in `/Users/tj/Desktop/torbit/vercel.json`

### Running background jobs appear stuck

Check:
- worker cron is running at the expected interval
- `/api/background-runs/worker` auth headers are present (`x-torbit-worker-token` or bearer `CRON_SECRET`)
- watchdog timeout is not set too high (`staleAfterSeconds`, default `600`)

### Worker health telemetry for governance

Background workers now emit `product_events` records for:
- `background_run.started`
- `background_run.succeeded`
- `background_run.failed`
- `background_run.retry_scheduled`
- `background_run.watchdog_marked_failed`
- `background_run.watchdog_retried`
- `background_run.watchdog_terminal_failure`

## 7. Notes

- `.env` is ignored; `.env.example` is commit-safe and should stay current.
- Do not commit real secrets.
- The repo may include additional in-progress feature work; use this runbook as the current operating baseline.
