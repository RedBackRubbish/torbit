-- 001_create_execution_ledger.up.sql
-- Forward migration: create execution_ledger table

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS execution_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL UNIQUE,
  project_id uuid,
  user_id uuid,
  status text NOT NULL CHECK (status IN ('idle','running','success','error','cancelled')),
  metadata jsonb DEFAULT '{}'::jsonb,
  cost numeric DEFAULT 0,
  tokens integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execution_ledger_run_id ON execution_ledger (run_id);
CREATE INDEX IF NOT EXISTS idx_execution_ledger_project_id ON execution_ledger (project_id);

-- Integrity assertion SQL (can be run after migration)
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'execution_ledger';
-- SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'execution_ledger';
