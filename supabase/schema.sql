-- ============================================
-- TORBIT Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  fuel_balance INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL DEFAULT 'web' CHECK (project_type IN ('web', 'mobile')),
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  knowledge_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_opened_at TIMESTAMPTZ
);

CREATE INDEX idx_projects_user ON public.projects(user_id);
CREATE INDEX idx_projects_updated ON public.projects(updated_at DESC);

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_project ON public.conversations(project_id);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  fuel_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);

-- ============================================
-- FUEL TRANSACTIONS
-- ============================================
CREATE TABLE public.fuel_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fuel_user ON public.fuel_transactions(user_id);
CREATE INDEX idx_fuel_project ON public.fuel_transactions(project_id);

-- ============================================
-- AUDIT EVENTS (Immutable ledger)
-- ============================================
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_project ON public.audit_events(project_id);
CREATE INDEX idx_audit_type ON public.audit_events(event_type);
CREATE INDEX idx_audit_created ON public.audit_events(created_at);

-- ============================================
-- PROJECT COLLABORATORS
-- ============================================
CREATE TABLE public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_collaborators_project ON public.project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_user ON public.project_collaborators(user_id);

-- ============================================
-- PROJECT PRESENCE (real-time collaboration heartbeat)
-- ============================================
CREATE TABLE public.project_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'idle', 'offline')),
  cursor JSONB,
  heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_presence_project ON public.project_presence(project_id);
CREATE INDEX idx_project_presence_user ON public.project_presence(user_id);
CREATE INDEX idx_project_presence_heartbeat ON public.project_presence(heartbeat_at DESC);

-- ============================================
-- BACKGROUND RUNS (async jobs)
-- ============================================
CREATE TABLE public.background_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  run_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  idempotency_key TEXT,
  retryable BOOLEAN NOT NULL DEFAULT TRUE,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1 AND max_attempts <= 10),
  cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
  last_heartbeat_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_background_runs_project ON public.background_runs(project_id);
CREATE INDEX idx_background_runs_user ON public.background_runs(user_id);
CREATE INDEX idx_background_runs_status ON public.background_runs(status);
CREATE INDEX idx_background_runs_created ON public.background_runs(created_at DESC);
CREATE INDEX idx_background_runs_retry_at ON public.background_runs(next_retry_at);
CREATE UNIQUE INDEX idx_background_runs_idempotency
  ON public.background_runs(project_id, user_id, run_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================
-- PRODUCT EVENTS (funnel telemetry)
-- ============================================
CREATE TABLE public.product_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_events_user ON public.product_events(user_id);
CREATE INDEX idx_product_events_project ON public.product_events(project_id);
CREATE INDEX idx_product_events_name ON public.product_events(event_name);
CREATE INDEX idx_product_events_occurred ON public.product_events(occurred_at DESC);

-- ============================================
-- SUPERVISOR EVENT LEDGER (run transparency)
-- ============================================
CREATE TABLE public.supervisor_event_ledger (
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

CREATE INDEX idx_supervisor_event_ledger_run ON public.supervisor_event_ledger(run_id, created_at);
CREATE INDEX idx_supervisor_event_ledger_project ON public.supervisor_event_ledger(project_id, created_at DESC);
CREATE INDEX idx_supervisor_event_ledger_user ON public.supervisor_event_ledger(user_id, created_at DESC);
CREATE INDEX idx_supervisor_event_ledger_event ON public.supervisor_event_ledger(event_type, created_at DESC);

-- ============================================
-- RPC: Atomic Fuel Deduction
-- ============================================
CREATE OR REPLACE FUNCTION public.deduct_fuel(
  p_user_id UUID,
  p_project_id UUID,
  p_amount INTEGER,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Get current balance with row lock
  SELECT fuel_balance INTO current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check sufficient balance
  IF current_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct fuel
  UPDATE public.profiles
  SET fuel_balance = fuel_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO public.fuel_transactions (user_id, project_id, amount, type, description)
  VALUES (p_user_id, p_project_id, -p_amount, 'usage', p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Fuel Refund
-- ============================================
CREATE OR REPLACE FUNCTION public.refund_fuel(
  p_user_id UUID,
  p_project_id UUID,
  p_amount INTEGER,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add fuel back
  UPDATE public.profiles
  SET fuel_balance = fuel_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO public.fuel_transactions (user_id, project_id, amount, type, description)
  VALUES (p_user_id, p_project_id, p_amount, 'refund', p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_event_ledger ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Projects: Users can CRUD their own projects
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Conversations: Users can CRUD their own conversations
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Messages: Access through conversation ownership
CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Fuel transactions: Read-only for own transactions
CREATE POLICY "Users can view own fuel transactions"
  ON public.fuel_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Audit events: Read-only for own projects
CREATE POLICY "Users can view audit events for own projects"
  ON public.audit_events FOR SELECT
  USING (auth.uid() = user_id);

-- Collaborators: visible to owner and each collaborator row owner
CREATE POLICY "Users can view project collaborators"
  ON public.project_collaborators FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can add collaborators"
  ON public.project_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can update collaborators"
  ON public.project_collaborators FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can remove collaborators"
  ON public.project_collaborators FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_collaborators.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Presence: collaborators can read/write own presence heartbeat
CREATE POLICY "Users can view project presence"
  ON public.project_presence FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_presence.project_id
      AND projects.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_collaborators
      WHERE project_collaborators.project_id = project_presence.project_id
      AND project_collaborators.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upsert own presence"
  ON public.project_presence FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = project_presence.project_id
        AND projects.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_collaborators
        WHERE project_collaborators.project_id = project_presence.project_id
        AND project_collaborators.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own presence"
  ON public.project_presence FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can clear own presence"
  ON public.project_presence FOR DELETE
  USING (auth.uid() = user_id);

-- Background runs: project members can create/read; owner or run owner can update
CREATE POLICY "Users can view background runs for accessible projects"
  ON public.background_runs FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = background_runs.project_id
      AND projects.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_collaborators
      WHERE project_collaborators.project_id = background_runs.project_id
      AND project_collaborators.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create background runs"
  ON public.background_runs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = background_runs.project_id
        AND projects.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_collaborators
        WHERE project_collaborators.project_id = background_runs.project_id
        AND project_collaborators.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Run owners or project owners can update background runs"
  ON public.background_runs FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = background_runs.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Run owners or project owners can delete background runs"
  ON public.background_runs FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = background_runs.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Product events: users can insert/read own telemetry; project scope must be accessible when provided.
CREATE POLICY "Users can view own product events"
  ON public.product_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own product events"
  ON public.product_events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = product_events.project_id
        AND projects.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_collaborators
        WHERE project_collaborators.project_id = product_events.project_id
        AND project_collaborators.user_id = auth.uid()
      )
    )
  );

-- Supervisor ledger: users can read/insert own run supervision events.
CREATE POLICY "Users can view own supervisor events"
  ON public.supervisor_event_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own supervisor events"
  ON public.supervisor_event_ledger FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = supervisor_event_ledger.project_id
        AND projects.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_collaborators
        WHERE project_collaborators.project_id = supervisor_event_ledger.project_id
        AND project_collaborators.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_project_collaborators_updated_at
  BEFORE UPDATE ON public.project_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_project_presence_updated_at
  BEFORE UPDATE ON public.project_presence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_background_runs_updated_at
  BEFORE UPDATE ON public.background_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
