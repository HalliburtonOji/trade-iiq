ALTER TABLE public.mentor_intents
  ADD COLUMN IF NOT EXISTS conviction smallint,
  ADD COLUMN IF NOT EXISTS fail_reasons jsonb NOT NULL DEFAULT '[]'::jsonb;