
-- Playbooks table
CREATE TABLE public.playbooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  strategy_type text NOT NULL DEFAULT 'custom',
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  invalidation_rules text DEFAULT '',
  example_screenshots text[] DEFAULT '{}',
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own playbooks" ON public.playbooks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Screenshot vault table
CREATE TABLE public.screenshot_vault (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  trade_id uuid REFERENCES public.paper_trades(id) ON DELETE SET NULL,
  symbol text NOT NULL DEFAULT 'UNKNOWN',
  image_url text NOT NULL,
  annotation text DEFAULT '',
  phase text NOT NULL DEFAULT 'general',
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.screenshot_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own screenshots" ON public.screenshot_vault FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Accountability streaks table
CREATE TABLE public.accountability_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_review_date date,
  pending_reviews integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.accountability_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own streaks" ON public.accountability_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
