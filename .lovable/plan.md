
# Where Sophos stands today

Verified against the live database and edge function logs:

- Heartbeat is healthy — `mentor-tick` ran at 11:10 UTC, cron firing every 5 min.
- 113 journal entries (108 are `skip`, 4 are `intent_published`, 1 is `open`).
- 1 open trade, 4 intents (3 still pending, BTC triggered at $79,993 → opened a position).
- BTC's trigger event wrote `kind: "open"` to the journal but **no** `intent_resolved` entry, so the "intent → trigger → trade" lineage is invisible to users.
- Existing `MentorPulse.tsx` only shows last-tick age + countdown. No intent activity, no trigger context, no "what just happened" surface.

So: not everything is done. Three things are broken/incomplete, and there is real room to make Sophos feel more alive.

---

# Part 1 — MentorPulse becomes a live intent ticker

Replace the current single-line heartbeat with a two-row component:

**Row A — heartbeat (kept):** awake/resting pill, last tick age, next tick countdown, stalled warning.

**Row B — Latest intent activity (new):** horizontally scrollable strip of the 5 most recent `intent_published`, `intent_resolved`, `open` (when `intent_id` is set), and `close` (when `intent_id` is set) journal entries. Each chip shows:

- Icon + status word: PUBLISHED / TRIGGERED / EXPIRED / CLOSED
- Symbol + direction
- Trigger line ("If AVAX moves above $10.00") or trigger result ("Triggered at $79,993")
- "X min ago", and a live distance-to-trigger for still-pending intents (e.g., "AVAX $9.42 → needs +6.2% to fire") computed from `quote_cache` / a tiny `live-quote` call
- Tapping a chip scrolls to the matching card in NEXT/NOW/PAST tab and highlights it (uses existing tab state via a small `useMentorFocus` zustand-style ref).

Realtime: subscribe to `mentor_intents` and `mentor_journal` so the strip flashes gold whenever a new intent is published or an existing one resolves. Reuses the existing pulse animation.

**Backend gap to fix at the same time:** in `mentor-tick`, when an intent fires, also write a `kind: "intent_resolved"` journal row (with `payload.resolution: "triggered"` and the trigger price). Today only an `open` row is written, so the "intent_resolved" history is empty. Same for the manual/time triggers later.

**Files**
- rewrite: `src/components/mentor/MentorPulse.tsx`
- new: `src/components/mentor/MentorIntentTicker.tsx` (the Row B sub-component, kept separate so the heartbeat stays cheap)
- new tiny hook: `src/hooks/useMentorFocus.ts` (just a setter/ref shared with `Mentor.tsx`)
- edit: `src/pages/Mentor.tsx` (read focus → switch tab + scrollIntoView)
- edit: `supabase/functions/mentor-tick/index.ts` (also write `intent_resolved` on trigger)

---

# Part 2 — Brainstorm: what makes a "living and breathing" mentor

These are the next features I'd build on top, ranked by how much they reinforce the past/present/future feel without bloating the page.

**Tier 1 — ship next (still on /mentor)**

1. **Conviction Meter on each intent.** Sophos already returns a thesis; have the AI also output a 1–5 conviction score and the 2 strongest "reasons it could fail." Render a small bar on `MentorIntentCard`. This makes the mentor honest about uncertainty and gives the user a real signal to filter copies.

2. **"Plan diff" on copy.** When a user clicks Copy Plan, before sending to the demo book show a 2-second diff modal: "Sophos sized at 1% (£100). Your account size = £8,420 → suggested qty 0.18. Adjust?" Educates the user that copying ≠ cloning blindly.

3. **Watchlist Radar.** A 5-row strip below MentorPulse showing every symbol Sophos has skipped in the last 24h with the *reason* he skipped ("waiting for volume", "ATR too tight"). Turns 108 noisy `skip` entries into one useful widget and proves he's actually scanning.

4. **Weekly Letter from Σοφός.** Every Sunday, an edge function (`mentor-weekly`) summarises the week's trades + skips into one short stoic note ("This week you watched me take 3 trades. The losing one taught me more than the winners."). Displayed at the top of the JOURNAL tab and pushed to followers via `notifications`.

**Tier 2 — deeper engagement**

5. **Mentor vs You — head-to-head game.** Extend `MentorVsYou` into a weekly leaderboard: who had better R-multiple last week, you or Sophos? Adds a drip of competitiveness without leaderboards-against-other-users.

6. **"Why didn't you take this?" prompts.** When Sophos opens a trade on a symbol the user is watching but didn't trade, push a notification and reveal a one-tap reflection input ("I was scared / I missed it / I disagreed"). Logs into `evening_reflections` for pattern detection.

7. **Replay Mode.** A scrubber on PAST trades that animates the price chart from open → close with Sophos's journal entries appearing at the time they were written. Uses `historical-candles`. Best teaching tool for swing trades.

8. **Live ATR / news context on each intent.** Tag intents with the catalyst ("Earnings Tuesday", "FOMC tomorrow") via `economic-calendar` data so users understand *why* the trigger is set where it is.

**Tier 3 — community & growth**

9. **Public Sophos page.** `/sophos/public` — unauthenticated, SEO-friendly snapshot (latest closed trade, equity curve, win rate). Drives signup. Cache via the existing `analysis_cache` pattern.

10. **Multi-personas (already deferred, but worth flagging).** Σοφός is the disciplined swing trader. Add Θρασύς (aggressive scalper) and Ἥσυχος (long-term holder) once the engine is proven. Same `mentor-tick` engine, parameterised by `mentor_profile.slug`.

11. **"Copy with rules" — playbook overlay.** When copying, automatically attach a Rulebook entry ("Don't copy any Sophos trade where conviction < 3"). Compounds with the Rulebook feature already in the app.

I'm proposing to **build only Part 1 now** (the MentorPulse rewrite + the journaling fix). For Part 2, after you read the brainstorm, pick the items you want next and I'll plan & ship them in the next round — Conviction Meter (#1) and Watchlist Radar (#3) are my recommendations because they directly make Sophos feel more alive and they reuse infrastructure that's already in place.

---

# Out of scope for this build
- Real-money copy trading.
- Multiple personas.
- Voice/audio reflections.
- Anything from Tier 2/3 above (those need their own approval round).
