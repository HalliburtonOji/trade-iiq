CREATE TABLE public.practice_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drill_id text NOT NULL,
  practice_type text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  passed boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0,
  xp_earned integer NOT NULL DEFAULT 0,
  weak_tags text[] DEFAULT '{}'::text[],
  attempt_count integer NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, drill_id)
);

ALTER TABLE public.practice_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own practice progress" ON public.practice_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own practice progress" ON public.practice_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own practice progress" ON public.practice_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);