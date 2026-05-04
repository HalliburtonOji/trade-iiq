# P23 — Σοφός (Sophos), the Living Trader

A persistent AI trader that lives in the app. Not a chatbot, not a signal feed — a **persona with a portfolio, a calendar, and a memory**. Past, present and future of every position are visible at all times so users can study the reasoning, copy the plan, and watch the outcome unfold.

## The metaphor

Imagine an ancient stoic trader sitting in the agora at his desk. You walk past him at any time of day and you can see:

- **Past** — every trade he's ever taken, with the original thesis, what actually happened, and the reflection he wrote afterwards.
- **Present** — what he's holding right now, P&L ticking live, with the original plan still pinned beside it ("entry 184.20, stop 181.50, target 192, invalidate if SPY < 555").
- **Future** — his watchlist with **pending intents**: "If AAPL closes above 188 on volume tomorrow, I open a half-size long. Otherwise I skip." Public, timestamped, falsifiable.

That triple visibility is the unlock. Most "AI trader" features only show signals (present) or backtests (past). Sophos shows the *intent* before it triggers, which is what makes him copyable and teachable.

## Pages & layout

```text
/mentor — Σοφός · The Living Trader
┌──────────────────────────────────────────────────┐
│  Σοφός  (B+ trader · 142 days alive)             │
│  "I trade what I'd want a student to see."       │
│  Equity ╱╲╱━━━╱━━╲╱━━╱  £10,842  +8.4% all-time │
│  ─────────────────────────────────────────────   │
│  [ NOW ]  [ NEXT ]  [ JOURNAL ]                  │
│                                                  │
│  ▸ NOW · 3 open                                  │
│   AAPL  long  +1.2%  plan ▸  copy ▸             │
│   BTC   short −0.4%  plan ▸  copy ▸             │
│   EURUSD long +0.1%  plan ▸  copy ▸             │
│                                                  │
│  ▸ NEXT · 2 pending intents                      │
│   NVDA  "If holds 480 by close → long ½ size"    │
│         triggers in: ~2h · copy plan ▸           │
│   GOLD  "Wait for retest of 2,340 before short"  │
│         triggers on: price · copy plan ▸         │
│                                                  │
│  ▸ JOURNAL · today                               │
│   09:14  Opened AAPL long · Why →                │
│   10:02  Skipped TSLA — "no clean level" · Why → │
│   11:30  Tightened SL on BTC                     │
│   16:00  Reflection — "Took NVDA too early..."   │
└──────────────────────────────────────────────────┘
```

Three tabs on one page: **NOW**, **NEXT**, **JOURNAL**. Same data, three timestamps.

### NOW — open positions

Each position card shows live P&L, the original entry/SL/TP, days held, and a "Plan" expander with the full thesis and the trigger that opened it. **Copy** button pre-fills `ThesisBuilder` with Sophos' symbol, direction, SL, TP and thesis text (attributed: *"From Σοφός · 4 May 2026"*).

### NEXT — pending intents (the killer feature)

Sophos publishes 1–4 forward-looking trade plans at a time. Each is a **conditional order in plain English**: trigger condition, direction, size, SL, TP, invalidation, time-window. Examples:

- *"If NVDA closes above 480 today on > avg volume, open ½-size long. SL 472, TP 498. Skip if SPY closes red."*
- *"Wait for BTC to retest 67,500 before short. Cancel after 48h."*

Users can **copy the plan** before it triggers, set their own alerts, and watch what Sophos actually does. Every intent eventually resolves to one of: TRIGGERED → trade in NOW, EXPIRED, INVALIDATED, MANUAL_CANCELLED. The resolution becomes a journal entry.

### JOURNAL — every action, narrated

A reverse-chronological feed of every decision: opens, closes, skips, intent publications, intent cancellations, stop adjustments, end-of-day reflections, weekly retrospectives. Each row links back to the trade or intent it concerns.

## Two extra surfaces

- **Dashboard widget** (`MentorPulse`): "Σοφός is up 1.2% today · 2 new intents · Open NVDA long." Tappable.
- **Compare strip** on `/portfolio`: "Σοφός vs You · last 30d" — sparkline of equity curves, win-rate gap, R-multiple gap. Friendly, not shaming.

## How Sophos thinks (the engine)

A scheduled edge function `mentor-tick` runs on a heartbeat. Each tick has four phases — past/present/future executed in order:

1. **Observe (past+present)** — pull live quotes for all open positions, mark-to-market, recompute equity.
2. **Manage (present)** — for each open position: SL/TP hit? Trail winners by ATR? Time-stop expired? Close → write a 2-sentence reflection.
3. **Resolve (future→present)** — for each pending intent: trigger condition met? → open position, move intent to TRIGGERED. Window expired? → mark EXPIRED with a 1-sentence postmortem.
4. **Plan (future)** — if open intent count < 3 and budget allows: scan the next watchlist slice, ask Lovable AI for a *new intent* (not an immediate trade) with `{symbol, direction, trigger_condition_text, size_pct, entry_hint, stop_loss, take_profit, invalidation_text, valid_until, thesis}`. Insert into `mentor_intents`. End-of-day, write a daily reflection summarizing the day's actions.

Hard rules (never AI-decided):
- ≤ 1 % notional risk per trade
- ≤ 5 open positions, ≤ 4 pending intents
- mandatory SL on every open
- no leverage > 3× crypto, > 1× stocks
- US session only for stocks, 24h for crypto

## How "copy" works

On any open trade or pending intent → **Copy plan** opens the existing `ThesisBuilder` pre-filled. For pending intents, we also offer **Set alert** (uses existing `price_alerts`) so the user gets pinged when Sophos' trigger condition fires, even if they don't want to copy size 1:1. Every copy increments a public counter on the source row → "127 students copied this plan" social proof. Tracked in `mentor_copies` for the user's own history.

## Data model

New tables (migration):

- `mentor_profile` — singleton: name, bio, equity, starting_balance, stats cache (win_rate, avg_R, max_dd, expectancy, days_alive).
- `mentor_trades` — mirrors `paper_trades`: symbol, direction, asset_type, entry_price, qty, stop_loss, take_profit, exit_price, pnl, status, opened_at, closed_at, thesis, intent_id (nullable FK).
- `mentor_intents` — id, symbol, direction, asset_type, trigger_condition_text, trigger_kind (`price_above`/`price_below`/`time`/`manual`), trigger_value numeric, entry_hint, stop_loss, take_profit, size_pct, invalidation_text, thesis, valid_until, status (`pending`/`triggered`/`expired`/`invalidated`/`cancelled`), created_at, resolved_at, resolution_note.
- `mentor_journal` — id, kind (`open`/`close`/`skip`/`intent_published`/`intent_resolved`/`adjust`/`reflection_daily`/`reflection_weekly`), trade_id, intent_id, body_text, created_at.
- `mentor_copies` — user_id, source_kind (`trade`|`intent`), source_id, paper_trade_id, created_at.
- `mentor_followers` — user_id, created_at (for future notifications).
- `mentor_locks` — single-row tick lock to prevent overlapping cron runs.

**RLS:** mentor_* tables world-readable to authenticated; writes locked to service role. `mentor_copies` and `mentor_followers` user-scoped. Public copy-counts via `SECURITY DEFINER` function `mentor_source_copy_count(text, uuid)`.

**Realtime:** publish `mentor_trades`, `mentor_intents`, `mentor_journal` so the page updates live without polling.

## Edge functions

- **`mentor-tick`** — the heartbeat. Runs Observe → Manage → Resolve → Plan. Idempotent via `mentor_locks`. Calls Lovable AI (`google/gemini-2.5-pro` for Plan, `gemini-2.5-flash` for reflections) with structured output (tool calling) so we never parse free text for trade fields.
- **`mentor-copy`** — validated server-side copy of a trade or intent into the caller's `paper_trades`. Records a `mentor_copies` row.
- **`mentor-summary`** — read-only aggregator for the dashboard widget (cached 60s).

`pg_cron`: schedule `mentor-tick` every **5 minutes during US session** (13:30–20:00 UTC, weekdays) and every **30 minutes** otherwise (for crypto + intent resolution). I'll set this up with the supabase insert tool, not a migration, since it embeds the function URL and anon key.

## Frontend

- `src/pages/Mentor.tsx` — three-tab page (NOW / NEXT / JOURNAL), Realtime-subscribed.
- `src/components/mentor/MentorHero.tsx` — equity sparkline, badge, persona quote.
- `src/components/mentor/MentorTradeCard.tsx` — open position w/ plan expander, copy button.
- `src/components/mentor/MentorIntentCard.tsx` — pending intent w/ trigger condition, copy + set-alert.
- `src/components/mentor/MentorJournalFeed.tsx` — narrated timeline.
- `src/components/mentor/MentorPulse.tsx` — dashboard widget.
- `src/components/mentor/MentorVsYou.tsx` — compare strip on portfolio.
- Add **Mentor** entry to `SideNav`, `StoaShell` (Grow · Σοφός), `FloatingHub`.

## Cost & cadence

Conservative gating means a typical day is ~12 Plan calls (Pro) + ~80 Manage/Resolve calls (Flash) + a couple of reflections. Well within the AI budget. Watchlist rotates a small slice per tick to keep quote API usage bounded — reuses existing `live-quote` cache.

## Out of scope (for later)

- Multiple personas (Aggressive Sophos, Cautious Sophos)
- Real-money copy-trading (compliance heavy)
- Voting on Sophos' next intent (would feed into a future Agora build)
- Sophos answering DMs (Oracle already handles personal coaching)

## Decision needed before I build

I'll default to:
- **Cadence:** 5 min during US session, 30 min off-hours
- **Starting equity:** £10,000 (matches user demo book)
- **Voice:** stoic but approachable, second person, ≤ 3 sentences per thesis

Say the word and I start with the migration + edge function + Mentor page in one sweep.