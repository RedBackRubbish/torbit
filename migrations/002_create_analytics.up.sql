-- 002_create_analytics.up.sql
-- Forward migration: create analytics tables for executions and performance

CREATE TABLE IF NOT EXISTS analytics_executions (
  id bigserial PRIMARY KEY,
  run_id text,
  project_id uuid,
  user_id uuid,
  status text,
  cost numeric DEFAULT 0,
  tokens integer DEFAULT 0,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_executions_run_id ON analytics_executions (run_id);

CREATE TABLE IF NOT EXISTS analytics_performance (
  id bigserial PRIMARY KEY,
  component_name text NOT NULL,
  metric jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Integrity assertions (run after migration):
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'analytics_executions';
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'analytics_performance';
