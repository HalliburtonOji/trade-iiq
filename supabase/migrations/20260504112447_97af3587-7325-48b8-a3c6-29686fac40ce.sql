-- Weekly stoic letters from Sophos
CREATE TABLE public.mentor_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_slug text NOT NULL DEFAULT 'sophos',
  week_starting date NOT NULL,
  title text NOT NULL,
  greek_phrase text,
  body_md text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  trades_won int NOT NULL DEFAULT 0,
  trades_lost int NOT NULL DEFAULT 0,
  intents_published int NOT NULL DEFAULT 0,
  intents_skipped int NOT NULL DEFAULT 0,
  pnl_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mentor_slug, week_starting)
);

ALTER TABLE public.mentor_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "letters readable by everyone"
ON public.mentor_letters FOR SELECT
USING (true);

CREATE INDEX idx_mentor_letters_week ON public.mentor_letters (mentor_slug, week_starting DESC);