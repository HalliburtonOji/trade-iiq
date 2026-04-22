-- ===== trades =====
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL DEFAULT 'long',
  entry_price NUMERIC,
  exit_price NUMERIC,
  r_multiple NUMERIC,
  pnl_usd NUMERIC,
  setup_grade TEXT,
  note TEXT DEFAULT '',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON public.trades FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trades_user_opened
  ON public.trades(user_id, opened_at DESC);

CREATE TRIGGER trades_set_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== account_snapshots =====
CREATE TABLE IF NOT EXISTS public.account_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  equity_usd NUMERIC NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
  ON public.account_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON public.account_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots"
  ON public.account_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
  ON public.account_snapshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_time
  ON public.account_snapshots(user_id, recorded_at DESC);

-- ===== daily_rules =====
CREATE TABLE IF NOT EXISTS public.daily_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  rules_total INTEGER NOT NULL DEFAULT 0,
  rules_followed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily rules"
  ON public.daily_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily rules"
  ON public.daily_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily rules"
  ON public.daily_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily rules"
  ON public.daily_rules FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER daily_rules_set_updated_at
  BEFORE UPDATE ON public.daily_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();