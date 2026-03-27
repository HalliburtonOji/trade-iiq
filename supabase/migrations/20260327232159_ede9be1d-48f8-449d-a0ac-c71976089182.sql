
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS preferred_assets text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS trading_goals text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.community_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  vote text NOT NULL DEFAULT 'BUY',
  voted_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own votes" ON public.community_votes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read votes" ON public.community_votes FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.trade_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  verdict text NOT NULL,
  thesis text NOT NULL DEFAULT '',
  confidence integer DEFAULT 70,
  display_name text DEFAULT 'Anonymous',
  likes_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.trade_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ideas" ON public.trade_ideas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own ideas" ON public.trade_ideas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ideas" ON public.trade_ideas FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.idea_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  idea_id uuid NOT NULL REFERENCES public.trade_ideas(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, idea_id)
);
ALTER TABLE public.idea_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own likes" ON public.idea_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read likes" ON public.idea_likes FOR SELECT TO authenticated USING (true);
