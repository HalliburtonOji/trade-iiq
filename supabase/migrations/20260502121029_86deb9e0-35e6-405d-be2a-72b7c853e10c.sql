-- 1. Extend XP source check
ALTER TABLE public.xp_ledger DROP CONSTRAINT IF EXISTS xp_ledger_source_check;
ALTER TABLE public.xp_ledger ADD CONSTRAINT xp_ledger_source_check
  CHECK (source = ANY (ARRAY[
    'lesson','drill','quiz','scenario','paper_trade',
    'daily_mission','trading_mission','initiation',
    'morning_brief','evening_reflection'
  ]));

-- 2. Profiles: timezone
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- 3. practice_streak table
CREATE TABLE IF NOT EXISTS public.practice_streak (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_morning_date date,
  last_evening_date date,
  last_full_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.practice_streak ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own practice streak" ON public.practice_streak
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_practice_streak_updated
  BEFORE UPDATE ON public.practice_streak
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. daily_briefs cache
CREATE TABLE IF NOT EXISTS public.daily_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brief_date date NOT NULL,
  symbols jsonb NOT NULL DEFAULT '[]'::jsonb,
  bias_focus text NOT NULL DEFAULT '',
  bias_explainer text NOT NULL DEFAULT '',
  discipline_focus text NOT NULL DEFAULT '',
  ai_summary text NOT NULL DEFAULT '',
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, brief_date)
);
ALTER TABLE public.daily_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own briefs" ON public.daily_briefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own briefs" ON public.daily_briefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own briefs" ON public.daily_briefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 5. evening_reflections
CREATE TABLE IF NOT EXISTS public.evening_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reflection_date date NOT NULL,
  lesson text NOT NULL DEFAULT '',
  rules_honoured jsonb NOT NULL DEFAULT '[]'::jsonb,
  intent_tomorrow text NOT NULL DEFAULT '',
  trade_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reflection_date)
);
ALTER TABLE public.evening_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reflections" ON public.evening_reflections
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Streak update RPC (atomic, idempotent per day)
CREATE OR REPLACE FUNCTION public.touch_practice_ritual(p_kind text)
RETURNS TABLE(current_streak int, longest_streak int, full_day boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_today date := current_date;
  v_row public.practice_streak%ROWTYPE;
  v_full boolean := false;
  v_inc boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT 0,0,false;
    RETURN;
  END IF;

  INSERT INTO public.practice_streak (user_id) VALUES (v_user)
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM public.practice_streak WHERE user_id = v_user;

  IF p_kind = 'morning' THEN
    v_row.last_morning_date := v_today;
  ELSIF p_kind = 'evening' THEN
    v_row.last_evening_date := v_today;
  END IF;

  -- Full day = both morning and evening completed today
  IF v_row.last_morning_date = v_today AND v_row.last_evening_date = v_today THEN
    v_full := true;
    IF v_row.last_full_date IS DISTINCT FROM v_today THEN
      v_inc := true;
      IF v_row.last_full_date = v_today - 1 THEN
        v_row.current_streak := COALESCE(v_row.current_streak,0) + 1;
      ELSE
        v_row.current_streak := 1;
      END IF;
      v_row.last_full_date := v_today;
      IF v_row.current_streak > COALESCE(v_row.longest_streak,0) THEN
        v_row.longest_streak := v_row.current_streak;
      END IF;
    END IF;
  END IF;

  UPDATE public.practice_streak SET
    last_morning_date = v_row.last_morning_date,
    last_evening_date = v_row.last_evening_date,
    last_full_date = v_row.last_full_date,
    current_streak = v_row.current_streak,
    longest_streak = v_row.longest_streak
    WHERE user_id = v_user;

  RETURN QUERY SELECT v_row.current_streak, v_row.longest_streak, v_full;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_practice_ritual(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_practice_ritual(text) TO authenticated;