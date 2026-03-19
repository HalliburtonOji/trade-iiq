
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ WATCHLIST ============
CREATE TABLE public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('stock', 'crypto', 'forex')),
  added_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watchlist" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);

-- ============ TRADE DECISIONS ============
CREATE TABLE public.trade_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'crypto', 'forex')),
  decision TEXT NOT NULL CHECK (decision IN ('BUY', 'WAIT', 'AVOID')),
  entry_price NUMERIC,
  notes TEXT DEFAULT '',
  outcome TEXT NOT NULL DEFAULT 'PENDING' CHECK (outcome IN ('PENDING', 'WIN', 'LOSS')),
  pnl_percent NUMERIC,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Thesis Builder fields
  thesis_why TEXT DEFAULT '',
  time_horizon TEXT CHECK (time_horizon IN ('scalp', 'swing', 'position', 'long-term')),
  invalidation_point NUMERIC,
  confidence INTEGER CHECK (confidence >= 1 AND confidence <= 5),
  catalyst_date DATE,
  catalyst_note TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trade_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decisions" ON public.trade_decisions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own decisions" ON public.trade_decisions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own decisions" ON public.trade_decisions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own decisions" ON public.trade_decisions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_trade_decisions_updated_at
  BEFORE UPDATE ON public.trade_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DECISION REVIEWS (Post-Mortem) ============
CREATE TABLE public.decision_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_decision_id UUID NOT NULL REFERENCES public.trade_decisions(id) ON DELETE CASCADE,
  verdict_correct BOOLEAN,
  timing_correct BOOLEAN,
  followed_plan BOOLEAN,
  execution_quality TEXT CHECK (execution_quality IN ('followed', 'partly', 'ignored')),
  emotion TEXT CHECK (emotion IN ('calm', 'confident', 'fomo', 'stressed', 'revenge')),
  mistake_type TEXT CHECK (mistake_type IN ('entered_early', 'ignored_macro', 'fomo', 'oversizing', 'no_stop', 'revenge_trade', 'none')),
  lesson_learned TEXT DEFAULT '',
  reviewed_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trade_decision_id)
);

ALTER TABLE public.decision_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews" ON public.decision_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON public.decision_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.decision_reviews FOR UPDATE USING (auth.uid() = user_id);

-- ============ LEARNING PROGRESS ============
CREATE TABLE public.learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  lesson_title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  completed_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  streak_day INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.learning_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.learning_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.learning_progress FOR UPDATE USING (auth.uid() = user_id);

-- ============ DAILY PICKS CACHE ============
CREATE TABLE public.daily_picks_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  stocks JSONB NOT NULL DEFAULT '[]',
  crypto JSONB NOT NULL DEFAULT '[]',
  forex JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_picks_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily picks" ON public.daily_picks_cache FOR SELECT USING (true);

-- ============ ANALYSIS CACHE ============
CREATE TABLE public.analysis_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'crypto', 'forex')),
  verdict TEXT CHECK (verdict IN ('BUY', 'WAIT', 'AVOID')),
  confidence INTEGER,
  risk_score INTEGER,
  setup_score INTEGER,
  technicals_json JSONB DEFAULT '{}',
  macro_json JSONB DEFAULT '{}',
  targets_json JSONB DEFAULT '{}',
  live_price NUMERIC,
  price_change NUMERIC,
  summary TEXT DEFAULT '',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(symbol, asset_type)
);

ALTER TABLE public.analysis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analysis cache" ON public.analysis_cache FOR SELECT USING (true);

-- ============ DAILY MISSIONS ============
CREATE TABLE public.daily_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  missions JSONB NOT NULL DEFAULT '[]',
  completed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 5,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missions" ON public.daily_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own missions" ON public.daily_missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.daily_missions FOR UPDATE USING (auth.uid() = user_id);

-- ============ USER PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  xp_total INTEGER NOT NULL DEFAULT 0,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  level TEXT NOT NULL DEFAULT 'Novice',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
