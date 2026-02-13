-- ============================================
-- EXECUTION LEDGER
-- Write-once append-only tracking of all agent executions
-- ============================================

-- Create the execution ledger table (append-only, immutable)
CREATE TABLE public.execution_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  agent_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  cost_json JSONB NOT NULL DEFAULT '{"total": 0, "breakdown": {}}'::jsonb,
  execution_trace_json JSONB NOT NULL DEFAULT '{"steps": [], "duration_ms": 0}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'aborted')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_execution_ledger_run_id ON public.execution_ledger(run_id);
CREATE INDEX idx_execution_ledger_project ON public.execution_ledger(project_id, created_at DESC);
CREATE INDEX idx_execution_ledger_user ON public.execution_ledger(user_id, created_at DESC);
CREATE INDEX idx_execution_ledger_agent ON public.execution_ledger(agent_id, created_at DESC);
CREATE INDEX idx_execution_ledger_status ON public.execution_ledger(status, created_at DESC);
CREATE INDEX idx_execution_ledger_timestamp ON public.execution_ledger(created_at DESC);

-- Create a covering index for cost aggregation queries
CREATE INDEX idx_execution_ledger_costs ON public.execution_ledger(agent_id, created_at DESC)
  INCLUDE (cost_json);

-- Enable Row Level Security
ALTER TABLE public.execution_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own project's execution ledgers
CREATE POLICY "Users can read own project execution ledger"
  ON public.execution_ledger
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Service role/system can insert records
CREATE POLICY "System can insert execution records"
  ON public.execution_ledger
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Prevent any updates or deletes (append-only)
CREATE POLICY "Prevent updates to execution ledger"
  ON public.execution_ledger
  FOR UPDATE
  USING (false);

CREATE POLICY "Prevent deletes from execution ledger"
  ON public.execution_ledger
  FOR DELETE
  USING (false);

-- Create a function to extract cost from cost_json for easier querying
CREATE OR REPLACE FUNCTION public.get_execution_total_cost(cost_json JSONB)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE((cost_json->>'total')::NUMERIC, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to extract execution duration
CREATE OR REPLACE FUNCTION public.get_execution_duration_ms(trace_json JSONB)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE((trace_json->>'duration_ms')::INTEGER, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create audit comments
COMMENT ON TABLE public.execution_ledger IS 'Immutable append-only log of all agent executions. Used for audit, cost tracking, and execution analysis.';
COMMENT ON COLUMN public.execution_ledger.run_id IS 'Unique execution identifier. Must be unique across all runs.';
COMMENT ON COLUMN public.execution_ledger.agent_id IS 'Agent class that performed the execution (e.g., backend, frontend, devops).';
COMMENT ON COLUMN public.execution_ledger.cost_json IS 'Cost breakdown including total and breakdown by cost type.';
COMMENT ON COLUMN public.execution_ledger.execution_trace_json IS 'Detailed execution trace with steps, durations, and tool calls.';
