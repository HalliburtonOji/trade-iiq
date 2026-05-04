
-- ============== Sophos: living trader ==============

-- 1. Singleton profile
CREATE TABLE public.mentor_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE DEFAULT 'sophos',
  name TEXT NOT NULL DEFAULT 'Σοφός',
  display_name TEXT NOT NULL DEFAULT 'Sophos',
  bio TEXT NOT NULL DEFAULT 'I trade what I''d want a student to see. Past, present and plan — always public.',
  starting_balance NUMERIC NOT NULL DEFAULT 10000,
  equity NUMERIC NOT NULL DEFAULT 10000,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  born_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Pending intents (the "future")
CREATE TABLE public.mentor_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'stock',
  direction TEXT NOT NULL CHECK (direction IN ('long','short')),
  trigger_kind TEXT NOT NULL CHECK (trigger_kind IN ('price_above','price_below','time','manual')),
  trigger_value NUMERIC,
  trigger_condition_text TEXT NOT NULL,
  entry_hint NUMERIC,
  stop_loss NUMERIC NOT NULL,
  take_profit NUMERIC NOT NULL,
  size_pct NUMERIC NOT NULL DEFAULT 1,
  invalidation_text TEXT NOT NULL DEFAULT '',
  thesis TEXT NOT NULL DEFAULT '',
  valid_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','triggered','expired','invalidated','cancelled')),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentor_intents_status ON public.mentor_intents(status, created_at DESC);

-- 3. Sophos' trades (the "present" + "past")
CREATE TABLE public.mentor_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'stock',
  direction TEXT NOT NULL CHECK (direction IN ('long','short')),
  entry_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  stop_loss NUMERIC NOT NULL,
  take_profit NUMERIC NOT NULL,
  exit_price NUMERIC,
  pnl NUMERIC,
  pnl_percent NUMERIC,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  thesis TEXT NOT NULL DEFAULT '',
  intent_id UUID REFERENCES public.mentor_intents(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  close_reflection TEXT
);
CREATE INDEX idx_mentor_trades_status ON public.mentor_trades(status, opened_at DESC);

-- 4. Narrated timeline
CREATE TABLE public.mentor_journal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('open','close','skip','intent_published','intent_resolved','adjust','reflection_daily','reflection_weekly')),
  trade_id UUID REFERENCES public.mentor_trades(id) ON DELETE SET NULL,
  intent_id UUID REFERENCES public.mentor_intents(id) ON DELETE SET NULL,
  symbol TEXT,
  body_text TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentor_journal_created ON public.mentor_journal(created_at DESC);

-- 5. Copies (per-user)
CREATE TABLE public.mentor_copies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('trade','intent')),
  source_id UUID NOT NULL,
  paper_trade_id UUID REFERENCES public.paper_trades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentor_copies_source ON public.mentor_copies(source_kind, source_id);
CREATE INDEX idx_mentor_copies_user ON public.mentor_copies(user_id, created_at DESC);

-- 6. Followers
CREATE TABLE public.mentor_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tick lock
CREATE TABLE public.mentor_locks (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  locked_at TIMESTAMPTZ,
  locked_by TEXT
);
INSERT INTO public.mentor_locks (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============== RLS ==============
ALTER TABLE public.mentor_profile     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_intents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_trades      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_journal     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_copies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_followers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_locks       ENABLE ROW LEVEL SECURITY;

-- World-readable to authenticated for the four public tables
CREATE POLICY "auth read mentor profile"  ON public.mentor_profile  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read mentor intents"  ON public.mentor_intents  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read mentor trades"   ON public.mentor_trades   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read mentor journal"  ON public.mentor_journal  FOR SELECT TO authenticated USING (true);

-- User-scoped copies
CREATE POLICY "users manage own copies" ON public.mentor_copies
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User-scoped followers
CREATE POLICY "users manage own follow" ON public.mentor_followers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public copy counter (security definer)
CREATE OR REPLACE FUNCTION public.mentor_source_copy_count(p_kind TEXT, p_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.mentor_copies
   WHERE source_kind = p_kind AND source_id = p_id
$$;
GRANT EXECUTE ON FUNCTION public.mentor_source_copy_count(TEXT, UUID) TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_intents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_journal;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_profile;

-- Seed the persona
INSERT INTO public.mentor_profile (slug) VALUES ('sophos') ON CONFLICT (slug) DO NOTHING;
