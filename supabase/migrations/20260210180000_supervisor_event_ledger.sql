-- Supervisor Event Ledger
-- Durable run-level event history for orchestration transparency.

CREATE TABLE IF NOT EXISTS public.supervisor_event_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'run_started',
    'intent_classified',
    'route_selected',
    'gate_started',
    'gate_passed',
    'gate_failed',
    'autofix_started',
    'autofix_succeeded',
    'autofix_failed',
    'fallback_invoked',
    'run_completed'
  )),
  stage TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supervisor_event_ledger_run ON public.supervisor_event_ledger(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_supervisor_event_ledger_project ON public.supervisor_event_ledger(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supervisor_event_ledger_user ON public.supervisor_event_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supervisor_event_ledger_event ON public.supervisor_event_ledger(event_type, created_at DESC);

ALTER TABLE public.supervisor_event_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supervisor_event_ledger'
      AND policyname = 'Users can view own supervisor events'
  ) THEN
    CREATE POLICY "Users can view own supervisor events"
      ON public.supervisor_event_ledger FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supervisor_event_ledger'
      AND policyname = 'Users can insert own supervisor events'
  ) THEN
    CREATE POLICY "Users can insert own supervisor events"
      ON public.supervisor_event_ledger FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
