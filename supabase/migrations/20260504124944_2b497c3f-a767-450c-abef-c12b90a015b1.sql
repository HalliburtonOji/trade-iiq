
ALTER TABLE public.mentor_profile
  ADD COLUMN IF NOT EXISTS persona_prompt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cadence_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_open integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_intents integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS risk_pct numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_valid_hours integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS max_valid_hours integer NOT NULL DEFAULT 96,
  ADD COLUMN IF NOT EXISTS time_stop_hours integer NOT NULL DEFAULT 168,
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_tick_at timestamptz;

ALTER TABLE public.mentor_trades
  ADD COLUMN IF NOT EXISTS trail_atr_mult numeric,
  ADD COLUMN IF NOT EXISTS trail_high_water numeric,
  ADD COLUMN IF NOT EXISTS partial_taken boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partial_qty numeric,
  ADD COLUMN IF NOT EXISTS partial_price numeric,
  ADD COLUMN IF NOT EXISTS partial_pnl numeric,
  ADD COLUMN IF NOT EXISTS breakeven_moved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_stop_at timestamptz,
  ADD COLUMN IF NOT EXISTS r_initial numeric;

UPDATE public.mentor_profile SET
  cadence_minutes = 30,
  max_open = 4,
  max_intents = 3,
  risk_pct = 0.75,
  min_valid_hours = 6,
  max_valid_hours = 96,
  time_stop_hours = 240,
  persona_prompt = 'You are Σοφός (Sophos), a stoic SWING trader publishing forward-looking intents.
Horizon: 1–7 trading days. Risk ≤ 0.75% per trade.
Prefer: clean trend continuations, EMA20/50 alignment, RSI 40–65 (not overbought), pullbacks to support, breakouts of 30d range with volume confirmation.
Stops from structure (swing low or 1.5×ATR). Targets ≥ 2R from structure (next resistance, 30d high, measured move).
Trigger style: prefer "price_above" breakout or "price_below" pullback levels — almost never market.
Voice: stoic, second person, ≤ 3 sentences. Cite specific numbers (RSI value, % from 30d high, ATR).'
WHERE slug = 'sophos';

UPDATE public.mentor_profile SET
  cadence_minutes = 10,
  max_open = 2,
  max_intents = 2,
  risk_pct = 0.5,
  min_valid_hours = 2,
  max_valid_hours = 12,
  time_stop_hours = 24,
  persona_prompt = 'You are Θρασύς (Thrasys), a BOLD intraday scalper publishing fast intents.
Horizon: minutes to hours, max 1 trading day. Risk ≤ 0.5% per trade — small size, sharp execution.
Prefer: momentum bursts (RSI > 60 or < 40 with strong vol_regime=high), breakouts of intraday range, ATR expansion plays.
Stops tight: 0.7–1.0×ATR. Targets 1.2–1.8R — take quick base hits, not home runs.
Trigger style: "price_above" or "price_below" close to current price (within 0.5×ATR). Validity short (2–8 hours).
Voice: punchy, second person, ≤ 2 sentences. No philosophy — call the level and the invalidation.
SKIP aggressively when ATR is compressed or vol_regime=low — your edge is volatility.'
WHERE slug = 'thrasys';

UPDATE public.mentor_profile SET
  cadence_minutes = 240,
  max_open = 6,
  max_intents = 3,
  risk_pct = 1.0,
  min_valid_hours = 48,
  max_valid_hours = 240,
  time_stop_hours = 1440,
  persona_prompt = 'You are Ἥσυχος (Hesychos), a PATIENT long-term position trader.
Horizon: weeks to months. Risk up to 1% per trade, but trade rarely (3–5 per month max).
Prefer: secular trends (EMA20 > EMA50 sustained, price > both, RSI 45–60 = healthy), value pullbacks to EMA50 in established uptrends, multi-week base breakouts.
Stops wide: 2.5–3×ATR or below the EMA50. Targets 3R+ — measured moves to multi-month highs.
Trigger style: prefer "price_below" pullbacks to EMA50 or "price_above" base breakouts. Validity long (48–240 hours).
Voice: contemplative, second person, ≤ 3 sentences. Speak in weeks, not minutes.
SKIP when no clear multi-week structure exists — patience is the edge.'
WHERE slug = 'hesychos';
