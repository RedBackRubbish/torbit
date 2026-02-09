-- ============================================
-- TORBIT Billing Schema (Stripe Integration)
-- Run this AFTER schema.sql in your Supabase SQL Editor
-- ============================================

-- ============================================
-- STRIPE CUSTOMERS
-- Maps Supabase users to Stripe customers
-- ============================================
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_user ON public.stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe ON public.stripe_customers(stripe_customer_id);

-- ============================================
-- SUBSCRIPTIONS
-- Tracks user subscription status
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'team', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  monthly_fuel_allowance INTEGER NOT NULL DEFAULT 100, -- Free tier: 100/day
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- ============================================
-- FUEL BALANCES
-- Server-side source of truth for fuel
-- ============================================
CREATE TABLE IF NOT EXISTS public.fuel_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_fuel INTEGER NOT NULL DEFAULT 0,
  lifetime_fuel_purchased INTEGER NOT NULL DEFAULT 0,
  lifetime_fuel_used INTEGER NOT NULL DEFAULT 0,
  last_daily_refill_at TIMESTAMPTZ, -- For free tier daily reset
  last_monthly_refill_at TIMESTAMPTZ, -- For subscription monthly refill
  user_timezone TEXT DEFAULT 'UTC', -- For midnight calculations
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_balances_user ON public.fuel_balances(user_id);

-- ============================================
-- BILLING TRANSACTIONS
-- Complete audit trail for all fuel changes
-- ============================================
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'subscription_refill',  -- Monthly subscription fuel
    'daily_refill',         -- Free tier daily reset
    'purchase',             -- One-time fuel pack purchase
    'usage',                -- Fuel consumption
    'refund',               -- Auditor rejected, fuel returned
    'bonus',                -- Admin granted bonus
    'adjustment'            -- Manual correction
  )),
  amount INTEGER NOT NULL, -- Positive = credit, negative = debit
  balance_after INTEGER NOT NULL, -- Snapshot of balance after transaction
  description TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_user ON public.billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_type ON public.billing_transactions(type);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created ON public.billing_transactions(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_transactions_stripe_payment_intent_unique
  ON public.billing_transactions(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_transactions_stripe_invoice_unique
  ON public.billing_transactions(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

-- ============================================
-- STRIPE WEBHOOK EVENTS
-- Tracks webhook idempotency and processing state
-- ============================================
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
  ON public.stripe_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created
  ON public.stripe_webhook_events(created_at DESC);

-- ============================================
-- RPC: Add Fuel (for purchases and refills)
-- ============================================
CREATE OR REPLACE FUNCTION public.add_fuel(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_invoice_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
  existing_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Lock balance row to serialize crediting operations for this user.
  SELECT current_fuel INTO existing_balance
  FROM public.fuel_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF existing_balance IS NULL THEN
    RAISE EXCEPTION 'No fuel balance record found for user %', p_user_id;
  END IF;

  -- Idempotency guard: Stripe payment intent has already been processed.
  IF p_stripe_payment_intent_id IS NOT NULL THEN
    SELECT balance_after INTO new_balance
    FROM public.billing_transactions
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF new_balance IS NOT NULL THEN
      RETURN new_balance;
    END IF;
  END IF;

  -- Idempotency guard: Stripe invoice has already been processed.
  IF p_stripe_invoice_id IS NOT NULL THEN
    SELECT balance_after INTO new_balance
    FROM public.billing_transactions
    WHERE stripe_invoice_id = p_stripe_invoice_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF new_balance IS NOT NULL THEN
      RETURN new_balance;
    END IF;
  END IF;

  -- Update fuel balance
  UPDATE public.fuel_balances
  SET 
    current_fuel = current_fuel + p_amount,
    lifetime_fuel_purchased = CASE 
      WHEN p_type IN ('purchase', 'subscription_refill', 'daily_refill', 'bonus') 
      THEN lifetime_fuel_purchased + p_amount 
      ELSE lifetime_fuel_purchased 
    END,
    last_monthly_refill_at = CASE 
      WHEN p_type = 'subscription_refill' THEN NOW() 
      ELSE last_monthly_refill_at 
    END,
    last_daily_refill_at = CASE 
      WHEN p_type = 'daily_refill' THEN NOW() 
      ELSE last_daily_refill_at 
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING current_fuel INTO new_balance;

  -- Insert transaction record
  INSERT INTO public.billing_transactions (
    user_id, 
    type, 
    amount, 
    balance_after, 
    description,
    stripe_payment_intent_id,
    stripe_invoice_id,
    metadata
  ) VALUES (
    p_user_id, 
    p_type, 
    p_amount, 
    new_balance, 
    p_description,
    p_stripe_payment_intent_id,
    p_stripe_invoice_id,
    p_metadata
  );

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Use Fuel (atomic deduction)
-- ============================================
CREATE OR REPLACE FUNCTION public.use_fuel(
  p_user_id UUID,
  p_project_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT) AS $$
DECLARE
  current_balance INTEGER;
  result_balance INTEGER;
BEGIN
  -- Get current balance with row lock
  SELECT current_fuel INTO current_balance
  FROM public.fuel_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user has fuel balance record
  IF current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'No fuel balance record found'::TEXT;
    RETURN;
  END IF;

  -- Check sufficient balance
  IF current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, current_balance, 'Insufficient fuel'::TEXT;
    RETURN;
  END IF;

  -- Deduct fuel
  UPDATE public.fuel_balances
  SET 
    current_fuel = current_fuel - p_amount,
    lifetime_fuel_used = lifetime_fuel_used + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING current_fuel INTO result_balance;

  -- Record transaction
  INSERT INTO public.billing_transactions (
    user_id, 
    project_id, 
    type, 
    amount, 
    balance_after, 
    description,
    metadata
  ) VALUES (
    p_user_id, 
    p_project_id, 
    'usage', 
    -p_amount, 
    result_balance, 
    p_description,
    p_metadata
  );

  RETURN QUERY SELECT TRUE, result_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Refund Fuel (Auditor guarantee)
-- ============================================
CREATE OR REPLACE FUNCTION public.refund_fuel_v2(
  p_user_id UUID,
  p_project_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_original_transaction_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Add fuel back
  UPDATE public.fuel_balances
  SET 
    current_fuel = current_fuel + p_amount,
    lifetime_fuel_used = GREATEST(0, lifetime_fuel_used - p_amount),
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING current_fuel INTO new_balance;

  -- Record refund transaction
  INSERT INTO public.billing_transactions (
    user_id, 
    project_id, 
    type, 
    amount, 
    balance_after, 
    description,
    metadata
  ) VALUES (
    p_user_id, 
    p_project_id, 
    'refund', 
    p_amount, 
    new_balance, 
    p_description,
    jsonb_build_object('original_transaction_id', p_original_transaction_id)
  );

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC: Check Daily Refill Eligibility
-- Returns true if free tier user should get refill
-- ============================================
CREATE OR REPLACE FUNCTION public.check_daily_refill(
  p_user_id UUID
)
RETURNS TABLE(eligible BOOLEAN, hours_until_refill INTEGER) AS $$
DECLARE
  user_tz TEXT;
  user_last_refill TIMESTAMPTZ;
  user_midnight TIMESTAMPTZ;
  now_in_user_tz TIMESTAMPTZ;
BEGIN
  -- Get user's timezone and last refill
  SELECT user_timezone, last_daily_refill_at 
  INTO user_tz, user_last_refill
  FROM public.fuel_balances
  WHERE user_id = p_user_id;

  -- Default to UTC if no timezone set
  user_tz := COALESCE(user_tz, 'UTC');

  -- Calculate user's current time
  now_in_user_tz := NOW() AT TIME ZONE user_tz;
  
  -- Calculate user's last midnight
  user_midnight := DATE_TRUNC('day', now_in_user_tz) AT TIME ZONE user_tz;

  -- If never refilled or last refill was before today's midnight
  IF user_last_refill IS NULL OR user_last_refill < user_midnight THEN
    RETURN QUERY SELECT TRUE, 0;
  ELSE
    -- Calculate hours until next midnight
    RETURN QUERY SELECT FALSE, 
      EXTRACT(EPOCH FROM (user_midnight + INTERVAL '1 day' - NOW()))::INTEGER / 3600;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Stripe customers: Users can only view their own
DROP POLICY IF EXISTS "Users can view own stripe customer" ON public.stripe_customers;
CREATE POLICY "Users can view own stripe customer"
  ON public.stripe_customers FOR SELECT
  USING (auth.uid() = user_id);

-- Subscriptions: Users can only view their own
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Fuel balances: Users can only view their own
DROP POLICY IF EXISTS "Users can view own fuel balance" ON public.fuel_balances;
CREATE POLICY "Users can view own fuel balance"
  ON public.fuel_balances FOR SELECT
  USING (auth.uid() = user_id);

-- Billing transactions: Users can only view their own
DROP POLICY IF EXISTS "Users can view own billing transactions" ON public.billing_transactions;
CREATE POLICY "Users can view own billing transactions"
  ON public.billing_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE BILLING RECORDS ON USER SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
RETURNS TRIGGER AS $$
BEGIN
  -- Create subscription record (free tier)
  INSERT INTO public.subscriptions (user_id, tier, status, monthly_fuel_allowance)
  VALUES (NEW.id, 'free', 'active', 100);

  -- Create fuel balance record (free tier starts with 100)
  INSERT INTO public.fuel_balances (user_id, current_fuel)
  VALUES (NEW.id, 100);

  -- Record initial fuel grant
  INSERT INTO public.billing_transactions (user_id, type, amount, balance_after, description)
  VALUES (NEW.id, 'bonus', 100, 100, 'Welcome bonus - free tier');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger after user signup
DROP TRIGGER IF EXISTS on_auth_user_created_billing ON auth.users;
CREATE TRIGGER on_auth_user_created_billing
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_billing();

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_fuel_balances_updated_at ON public.fuel_balances;
CREATE TRIGGER update_fuel_balances_updated_at
  BEFORE UPDATE ON public.fuel_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_stripe_webhook_events_updated_at ON public.stripe_webhook_events;
CREATE TRIGGER update_stripe_webhook_events_updated_at
  BEFORE UPDATE ON public.stripe_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- SUBSCRIPTION TIER CONFIGURATION (Reference)
-- ============================================
COMMENT ON TABLE public.subscriptions IS '
Tier Configuration:
- free: 100 fuel/day (resets at user midnight), all models
- pro: 5000 fuel/month (refills on billing date), all models, $29/mo
- team: 25000 fuel/month (shared across 5 seats), all models, $99/mo
- enterprise: Custom fuel, priority support, custom pricing
';

-- ============================================
-- RPC: Process Daily Refill (atomic check + refill)
-- Prevents double-credit races on concurrent requests
-- ============================================
CREATE OR REPLACE FUNCTION public.process_daily_refill(
  p_user_id UUID,
  p_refill_amount INTEGER
)
RETURNS TABLE(refilled BOOLEAN, amount INTEGER, hours_until_refill INTEGER) AS $$
DECLARE
  user_tz TEXT;
  user_last_refill TIMESTAMPTZ;
  user_midnight TIMESTAMPTZ;
  now_in_user_tz TIMESTAMPTZ;
  next_midnight TIMESTAMPTZ;
  new_balance INTEGER;
BEGIN
  -- Lock user fuel row so eligibility + credit is atomic
  SELECT user_timezone, last_daily_refill_at
  INTO user_tz, user_last_refill
  FROM public.fuel_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF user_tz IS NULL THEN
    user_tz := 'UTC';
  END IF;

  IF user_tz = '' THEN
    user_tz := 'UTC';
  END IF;

  -- Calculate user-local midnight boundary
  now_in_user_tz := NOW() AT TIME ZONE user_tz;
  user_midnight := DATE_TRUNC('day', now_in_user_tz) AT TIME ZONE user_tz;

  -- Eligible if never refilled or last refill predates today's local midnight
  IF user_last_refill IS NULL OR user_last_refill < user_midnight THEN
    UPDATE public.fuel_balances
    SET
      current_fuel = current_fuel + p_refill_amount,
      lifetime_fuel_purchased = lifetime_fuel_purchased + p_refill_amount,
      last_daily_refill_at = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING current_fuel INTO new_balance;

    INSERT INTO public.billing_transactions (
      user_id,
      type,
      amount,
      balance_after,
      description,
      metadata
    ) VALUES (
      p_user_id,
      'daily_refill',
      p_refill_amount,
      new_balance,
      'Daily free tier fuel refill',
      jsonb_build_object('tier', 'free')
    );

    RETURN QUERY SELECT TRUE, p_refill_amount, 0;
    RETURN;
  END IF;

  next_midnight := user_midnight + INTERVAL '1 day';

  RETURN QUERY SELECT
    FALSE,
    NULL::INTEGER,
    GREATEST(0, (EXTRACT(EPOCH FROM (next_midnight - NOW()))::INTEGER / 3600));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
