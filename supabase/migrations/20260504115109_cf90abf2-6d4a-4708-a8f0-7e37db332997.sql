CREATE TABLE IF NOT EXISTS public.mentor_case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL UNIQUE,
  intent_id uuid,
  symbol text NOT NULL,
  asset_type text NOT NULL DEFAULT 'stock',
  direction text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('win','loss','breakeven')),
  r_multiple numeric,
  pnl_pct numeric,
  title text NOT NULL,
  hook text NOT NULL DEFAULT '',
  setup text NOT NULL DEFAULT '',
  entry_rationale text NOT NULL DEFAULT '',
  what_happened text NOT NULL DEFAULT '',
  lesson text NOT NULL DEFAULT '',
  key_takeaway text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  greek_phrase text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_case_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case studies readable by everyone"
  ON public.mentor_case_studies FOR SELECT TO public USING (true);

CREATE INDEX IF NOT EXISTS mentor_case_studies_created_at_idx
  ON public.mentor_case_studies (created_at DESC);

CREATE INDEX IF NOT EXISTS mentor_case_studies_symbol_idx
  ON public.mentor_case_studies (symbol);

CREATE INDEX IF NOT EXISTS mentor_case_studies_tags_idx
  ON public.mentor_case_studies USING GIN (tags);