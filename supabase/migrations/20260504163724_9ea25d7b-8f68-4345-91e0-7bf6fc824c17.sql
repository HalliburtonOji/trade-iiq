
-- 1) Predictions: users predict outcome of a pending intent
CREATE TABLE public.mentor_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  intent_id UUID NOT NULL REFERENCES public.mentor_intents(id) ON DELETE CASCADE,
  mentor_slug TEXT NOT NULL,
  symbol TEXT NOT NULL,
  prediction TEXT NOT NULL CHECK (prediction IN ('tp_hit','sl_hit','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  outcome TEXT,
  correct BOOLEAN,
  UNIQUE (user_id, intent_id)
);
ALTER TABLE public.mentor_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "predictions self read" ON public.mentor_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "predictions self write" ON public.mentor_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "predictions self update" ON public.mentor_predictions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "predictions self delete" ON public.mentor_predictions FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX mentor_predictions_intent_idx ON public.mentor_predictions(intent_id);

-- 2) Personal coach notes: per-user, written by mentor-coach fn when user closes a paper trade
CREATE TABLE public.mentor_coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mentor_slug TEXT NOT NULL DEFAULT 'sophos',
  user_trade_id UUID,
  symbol TEXT,
  tone TEXT,
  headline TEXT,
  body_text TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mentor_coach_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach notes self read" ON public.mentor_coach_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coach notes self insert" ON public.mentor_coach_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX mentor_coach_notes_user_idx ON public.mentor_coach_notes(user_id, created_at DESC);

-- 3) intents.outcome: terminal classification used for prediction resolution
ALTER TABLE public.mentor_intents ADD COLUMN IF NOT EXISTS outcome TEXT;
-- backfill: triggered intents whose trade has closed get tp/sl based on exit
UPDATE public.mentor_intents i
   SET outcome = CASE
     WHEN t.exit_price IS NULL THEN NULL
     WHEN (i.direction='long' AND t.exit_price >= t.take_profit) OR (i.direction='short' AND t.exit_price <= t.take_profit) THEN 'tp_hit'
     WHEN (i.direction='long' AND t.exit_price <= t.stop_loss) OR (i.direction='short' AND t.exit_price >= t.stop_loss) THEN 'sl_hit'
     ELSE 'closed'
   END
  FROM public.mentor_trades t
 WHERE t.intent_id = i.id AND t.status = 'closed';
UPDATE public.mentor_intents SET outcome = 'expired' WHERE status = 'expired' AND outcome IS NULL;
