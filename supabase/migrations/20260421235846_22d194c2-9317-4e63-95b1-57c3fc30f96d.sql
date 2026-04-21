CREATE TABLE public.recommended_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMPTZ
);

ALTER TABLE public.recommended_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recommended lessons"
  ON public.recommended_lessons FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_recommended_lessons_user_active
  ON public.recommended_lessons(user_id, created_at DESC)
  WHERE dismissed_at IS NULL;