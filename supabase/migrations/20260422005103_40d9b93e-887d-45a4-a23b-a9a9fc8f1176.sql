
-- ============ JOURNAL ENTRIES ============
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  morning_prep TEXT DEFAULT '',
  setups TEXT DEFAULT '',
  what_happened TEXT DEFAULT '',
  lessons TEXT DEFAULT '',
  closing_note TEXT DEFAULT '',
  reflections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON public.journal_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_journal_updated BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CODEX LESSONS ============
CREATE TABLE IF NOT EXISTS public.codex_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_kicker TEXT NOT NULL,
  greek_label TEXT,
  folio_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  teaser TEXT DEFAULT '',
  body_markdown TEXT DEFAULT '',
  read_minutes INTEGER DEFAULT 5,
  marginalia_quote TEXT,
  marginalia_author TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.codex_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read codex" ON public.codex_lessons
  FOR SELECT TO authenticated USING (true);

-- ============ LESSON PROGRESS ============
CREATE TABLE IF NOT EXISTS public.codex_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.codex_lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  scroll_pct INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, lesson_id)
);
ALTER TABLE public.codex_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own codex progress" ON public.codex_lesson_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ ORACLE ============
CREATE TABLE IF NOT EXISTS public.oracle_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'Untitled session',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.oracle_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own oracle sessions" ON public.oracle_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_oracle_session_updated BEFORE UPDATE ON public.oracle_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.oracle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.oracle_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','oracle')),
  content TEXT NOT NULL,
  context_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.oracle_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own oracle messages" ON public.oracle_messages
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ USER PREFERENCES ============
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY,
  identity JSONB NOT NULL DEFAULT '{}'::jsonb,
  oracle JSONB NOT NULL DEFAULT '{"read_journal":true,"read_trades":true,"read_rules":true,"tone":"Stoic","max_tokens":600}'::jsonb,
  alerts JSONB NOT NULL DEFAULT '{"push":false,"email":"off","violations":true}'::jsonb,
  markets JSONB NOT NULL DEFAULT '{"active":["us_equities"],"default_size_pct":1,"max_daily_loss_pct":3,"hard_halt":true}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON public.user_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED CODEX LESSONS ============
INSERT INTO public.codex_lessons (chapter_kicker, greek_label, folio_number, title, teaser, read_minutes, marginalia_quote, marginalia_author, body_markdown) VALUES
('RISK', 'Μοῖραι', 1, 'The Three Fates of Every Trade',
 'Klotho spins your size, Lachesis measures your reward, Atropos cuts your loss. None of them care about your conviction.',
 6, 'You have power over your mind — not outside events. Realize this, and you will find strength.', 'Marcus Aurelius',
'Every trade you take is governed by three forces older than the markets themselves. The Greeks called them the Moirai — the Fates. Klotho spun the thread of life. Lachesis measured it. Atropos cut it.

Translate them: position size, reward target, maximum loss. These are the only three numbers you control before price moves. Everything else — the chart, the news, the conviction in your gut — is theatre.

The discipline is not in finding setups. It is in obeying the three Fates *before* the trigger pulls. A trader who sizes by feeling, targets by hope, and stops by pain is not a trader. He is a tourist with a brokerage account.

Klotho asks: how much of your account is at risk on this single trade? If you cannot answer in dollars, you have not yet entered. Lachesis asks: where, exactly, will you take the reward? If "I will see how it goes" is the answer, you have already lost. Atropos asks: at what price are you wrong? If the answer is "I will know it when I see it," Atropos will cut you, and she does not negotiate.

Sit with these three before every entry. The market is indifferent to whether you obey them. But your equity curve is not.'),

('PROCESS', 'Ἀγών', 2, 'The Agon — Why Process Beats Outcome',
 'A good process can produce a bad trade. A bad process can produce a great trade. Only one of these compounds.',
 7, 'It is not what happens to you, but how you react to it that matters.', 'Epictetus',
'The Greek word *agon* means contest. Not the spectacle, but the discipline beneath it — the years of training that make a fight look effortless.

Markets reward outcomes in the short run and process in the long run. This is the cruelest joke they play on beginners. A reckless trader takes a 10x and feels chosen. A disciplined trader takes a measured loss and feels punished. Both are wrong about themselves.

Judge yourself only on the questions you can answer before the trade closes. Did you size correctly? Did you set a stop? Did you wait for your setup, or did you reach? Did you log the decision? These are the only honest scores.

Outcome is the market''s verdict, and the market lies often in the short run. Process is your verdict on yourself, and it does not lie. Keep score on what you control. Let the rest pass.'),

('EMOTION', 'Θυμός', 3, 'The Thymos — Anger, Greed, and the Trader',
 'The Greeks called the seat of passion thymos. Plato said reason must rein it in. Your P&L agrees.',
 5, 'No man is free who is not master of himself.', 'Epictetus',
'Plato divided the soul into three parts: reason, *thymos* (spirit, passion, the seat of anger and pride), and appetite. Wisdom, he said, is reason ruling the other two through right balance.

Every blown account is a story of *thymos* in command. The revenge trade after a stop-out. The size-up after three winners. The held loser because admitting error feels worse than losing money. These are not strategy errors. They are governance errors.

The remedy is not to suppress *thymos* — you cannot. The remedy is to design your day so that reason has the first and last word. A pre-market checklist. A position-size formula. A rule that says: after two losses, walk away. These are not constraints on your trading. They are how reason keeps the throne.

When *thymos* roars, do nothing. Get up. Walk. Drink water. Return to the desk only when the voice has quieted. The market will still be there. Your account, if you are lucky, will also still be there.');
