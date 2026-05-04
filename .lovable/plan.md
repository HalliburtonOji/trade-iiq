
# Where the Sophos plan stands

**Shipped:**
- Live heartbeat + Intent Ticker (MentorPulse + MentorIntentTicker)
- Tab focus / scroll highlighting from ticker → NOW/NEXT/PAST cards
- `intent_resolved` journaling fix in `mentor-tick`
- Conviction Meter (1–5) + "How this could fail" on every intent
- Watchlist Radar (24h skip aggregator, bucketed reasons)
- Plan Diff sizing modal (risk %, qty, notional, over-leverage warnings)
- Weekly Epistle (`mentor-weekly` + `mentor_letters` + EPISTLE tab + Sunday 17:00 UTC cron)
- Sidebar entry under GROW (Σοφός)
- Public profile (`/sophos/public`) with public-read RLS
- Auto-generated Case Studies (`mentor-case-study` + `mentor_case_studies` + CASES tab + `/learn/case/:id`)
- **Mirror Mode** auto-copy (`mentor-mirror-fanout` + `mentor_followers.mirror_enabled` + MentorMirrorToggle UI)

**Still in the original brainstorm, not built (Tier 2/3):**
- Mentor vs You weekly leaderboard (MentorVsYou exists but no week-over-week R-multiple game)
- "Why didn't you take this?" missed-trade reflection prompts
- Replay Mode for past trades (animated chart + journal scrub)
- Live ATR / news catalyst tags on intents
- Multi-personas (Θρασύς scalper, Ἥσυχος long-term)
- "Copy with rules" playbook overlay


---

# Brainstorm: linking Sophos to the rest of the app

Right now Sophos is a beautiful island at `/mentor`. Everywhere else (Demo Trading, Learn, Review, Morning/Evening, Insights, Playbook) acts like he doesn't exist. The win is making him *the connective tissue* — a single voice that shows up wherever the user is making, reviewing or learning a decision.

Mapped by surface:

### 1. Demo Trading (`/demo-trading`) — "Trade alongside the master"
- **Sophos Sidebar Strip** on the trade ticket: while the user is sizing a trade on AAPL, show "Sophos has an open AAPL long since 2 days ago, +1.4%" or "Sophos skipped AAPL 3h ago — reason: ATR too tight." Pulls from `mentor_trades` + `mentor_journal` filtered by symbol.
- **"Sophos disagrees" warning**: if user opens a long where Sophos has a published *short* intent (or vice versa), Setup Score modal shows a Σοφός badge with his thesis. Friction without forcing.
- **Mirror Mode toggle** (per account, opt-in): every Sophos open → push notification + one-tap copy via existing `mentor-copy`. Existing PlanDiff reused.
- **Post-trade attribution**: when a copied trade closes, the Trade Review screen shows side-by-side "Yours vs Sophos" R-multiple — surfaces the cost of late entries / early exits.

### 2. Learn (`/learn`) — "Sophos is the textbook in motion"
- **Live exemplar links on lessons**: every lesson tags a `concept_slug` (e.g. `breakout-retest`, `risk-1pct`). When Sophos publishes/closes a trade tagged with that concept, surface a "Sophos just did this — go watch" card on the matching lesson. Built off `mentor_journal.payload.tags[]` (add to AI schema).
- **Sophos Case Studies tab in Learn**: auto-generated lesson library from his closed trades. Each closed trade → 1-screen case study (Setup → Thesis → Outcome → Lesson). Reuses `MentorPastList` styling, plus a small AI summary via Gemini Flash.
- **Drill cross-link**: when the user fails a Pattern Drill (e.g. "Identify a fakeout"), suggest the closest matching closed Sophos trade as a real-world example.

### 3. Review (`/review`) + Evening (`/evening`)
- **"Sophos's day" block**: every evening reflection shows what Sophos did today (1 line per event). Cheap, daily, makes the app feel alive even on quiet user days.
- **Decision diff in Weekly Coaching**: for the user's losing trades, run a quick check — "On this same day, Sophos was in cash" or "Sophos took the opposite side and won." Hard truth, plain English.
- **Council Banner** could include Sophos as the 4th voice ("The Disciplined Trader") alongside the existing personas in `CouncilBanner.tsx`.

### 4. Morning Brief (`/morning`)
- **Sophos's Watchlist** — top of the brief, 3 symbols he's currently watching (pending intents) with one-line reasons. Steers user attention before the day starts.
- **"Conviction tells you the weather"**: average conviction across pending intents → mood pill ("Sophos is cautious today — only 2/5 average conviction").

### 5. Playbook (`/playbook`)
- **Import a Sophos rule**: every time Sophos's weekly Letter mentions a discipline ("never copy when conviction <3"), offer a one-click "Add this to my Rulebook." Compounds with existing `daily_rules` + `rule_violations` infra.
- **Strategy alignment badge**: tag each user playbook with a strategy_type; show "Sophos's win rate on this strategy: 62% over 14 trades" using `mentor_trades` filtered by playbook tags.

### 6. Insights (`/insights`) / DQS
- **Sophos benchmark line** on the user's equity curve and DQS sparkline. Comparative, not punitive — "your DQS 71, Sophos 84."
- **Bias overlap detection**: cross-reference user bias detector flags with Sophos's same-day journal. If user revenge-traded and Sophos was patient, surface that as a coaching moment.

### 7. Oracle (`/oracle`) chatbot
- **Sophos context injection**: the chat prompt already knows the user; also pass last 5 mentor journal entries + open intents. Now the user can ask "Why is Sophos in NVDA?" and get a real answer from Oracle, not Sophos's voice but Oracle citing him. Cheap unification.

### 8. Daily Practice (Hexis) + Missions
- **Mission: "Read Sophos's journal today"** (+5 XP) — drives daily return to /mentor.
- **Mission: "Diff your trade against Sophos"** — opens Plan Diff on any open user trade, awards XP for the comparison even without copying.
- **Streak tie-in**: weekly Epistle published on Sunday auto-grants a "Letter Read" mission Monday morning.

### 9. Notifications + Floating Hub
- Push real-time `notifications` rows when Sophos opens/closes/publishes — already have the table + RLS, just not wired. Tap → focus to the matching card via existing `useMentorFocus`.

### 10. Onboarding
- New "Pick your mentor" step in OnboardingWizard. For now only Sophos exists, but it sets up the multi-personas Tier 3 work cleanly and primes the user to expect this voice everywhere.

---

# Recommended next build (one round)

Pick the 3 that give the biggest "Sophos is everywhere" feel for the least new infra. My recommendation:

### A. **Sophos Sidebar Strip on Demo Trading** (highest leverage)
A small `MentorSymbolStrip` component that, given a symbol, queries:
- open `mentor_trades` for that symbol
- pending `mentor_intents` for that symbol
- last 24h `mentor_journal` skips for that symbol

Renders one compact card with a "View on Sophos" CTA (uses `focusMentor()` + navigate). Drop into:
- `DemoTrading.tsx` trade ticket
- `Analysis.tsx` symbol page
- `Charts.tsx` toolbar

Two new files, three insertions. Massive perceived integration.

### B. **"Sophos's Day" block in Evening + Morning**
Top-of-page strip on `/evening` and `/morning` listing today's mentor events (max 4) with timestamps. Uses existing `mentor_journal`. ~80 lines.

### C. **Notifications wiring + missed-trade reflection**
- Add inserts to `notifications` inside `mentor-tick` for `intent_published` and `open` events (one row per follower).
- New "Why didn't you take this?" sheet on the notification — saves a row to `evening_reflections` with the missed trade context.

### D. **Oracle context injection** (1-line backend change, huge UX)
In `supabase/functions/oracle/index.ts`, before the Gemini call, fetch latest 5 `mentor_journal` + open intents and append to system prompt. Now Oracle knows Sophos.

### E. **Mission integration**
Add 2 mission types to `tradingMissions.ts`:
- `read_mentor_journal` (visit /mentor + scroll JOURNAL tab)
- `mentor_plan_diff` (open PlanDiff on any Sophos intent)

Wire detection in `useDailyMissionsState.ts`.

---

# Out of scope for this build
- Replay Mode (needs historical-candles scrubbing UI, big standalone task)
- Public `/sophos/public` page (SEO/marketing surface, separate round)
- Multi-personas (engine work, separate round)
- Mirror Mode auto-copy (regulatory/UX care needed)
- Sophos Case Studies auto-generator (needs concept tagging schema first)

---

# Files to change if you approve A–E

**New:**
- `src/components/mentor/MentorSymbolStrip.tsx`
- `src/components/mentor/MentorTodayStrip.tsx`
- `src/components/mentor/MissedTradeSheet.tsx`

**Edit:**
- `src/pages/DemoTrading.tsx`, `src/pages/Analysis.tsx`, `src/pages/Charts.tsx` — drop in symbol strip
- `src/pages/Morning.tsx`, `src/pages/Evening.tsx` — drop in today strip
- `src/components/NotificationPanel.tsx` — handle mentor notif tap → MissedTradeSheet
- `supabase/functions/mentor-tick/index.ts` — insert notifications on publish/open
- `supabase/functions/oracle/index.ts` — inject mentor context
- `src/data/tradingMissions.ts` + `src/hooks/useDailyMissionsState.ts` — 2 new missions

No DB migrations needed — every table already exists.

---

**Tell me which of A–E to ship in the next round.** A + B + D is my minimum-viable "Sophos is everywhere" pass; A + B + C + D + E is the full integration.
