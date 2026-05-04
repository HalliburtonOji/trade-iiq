-- 1) Multi-mentor tagging on existing tables
ALTER TABLE public.mentor_intents       ADD COLUMN IF NOT EXISTS mentor_slug text NOT NULL DEFAULT 'sophos';
ALTER TABLE public.mentor_trades        ADD COLUMN IF NOT EXISTS mentor_slug text NOT NULL DEFAULT 'sophos';
ALTER TABLE public.mentor_journal       ADD COLUMN IF NOT EXISTS mentor_slug text NOT NULL DEFAULT 'sophos';
ALTER TABLE public.mentor_case_studies  ADD COLUMN IF NOT EXISTS mentor_slug text NOT NULL DEFAULT 'sophos';

CREATE INDEX IF NOT EXISTS idx_mentor_intents_slug      ON public.mentor_intents(mentor_slug);
CREATE INDEX IF NOT EXISTS idx_mentor_trades_slug       ON public.mentor_trades(mentor_slug);
CREATE INDEX IF NOT EXISTS idx_mentor_journal_slug      ON public.mentor_journal(mentor_slug);
CREATE INDEX IF NOT EXISTS idx_mentor_case_studies_slug ON public.mentor_case_studies(mentor_slug);

-- 2) Persona display metadata on mentor_profile
ALTER TABLE public.mentor_profile
  ADD COLUMN IF NOT EXISTS persona_kind text NOT NULL DEFAULT 'swing',
  ADD COLUMN IF NOT EXISTS persona_color text NOT NULL DEFAULT '#c9a86a',
  ADD COLUMN IF NOT EXISTS persona_tagline text NOT NULL DEFAULT '';

-- 3) Missed-trade reflections — per-user record of trades they skipped
CREATE TABLE IF NOT EXISTS public.mentor_missed_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trade_id uuid,
  intent_id uuid,
  symbol text NOT NULL,
  mentor_slug text NOT NULL DEFAULT 'sophos',
  reason text,
  note text,
  pnl_at_reflection numeric,
  prompted_at timestamptz NOT NULL DEFAULT now(),
  reflected_at timestamptz,
  dismissed_at timestamptz,
  CONSTRAINT mentor_missed_unique_per_trade UNIQUE (user_id, trade_id)
);

CREATE INDEX IF NOT EXISTS idx_missed_user_pending
  ON public.mentor_missed_reflections (user_id)
  WHERE reflected_at IS NULL AND dismissed_at IS NULL;

ALTER TABLE public.mentor_missed_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own missed reflections"
  ON public.mentor_missed_reflections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);