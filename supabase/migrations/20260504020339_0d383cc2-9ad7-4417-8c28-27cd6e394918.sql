CREATE TABLE public.mentor_intent_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  intent_id UUID NOT NULL REFERENCES public.mentor_intents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, intent_id)
);
ALTER TABLE public.mentor_intent_watchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own watchers select" ON public.mentor_intent_watchers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own watchers insert" ON public.mentor_intent_watchers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own watchers delete" ON public.mentor_intent_watchers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_mentor_intent_watchers_intent ON public.mentor_intent_watchers(intent_id);