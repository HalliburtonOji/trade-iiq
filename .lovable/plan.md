# P19 — Μύησις (Initiation)

After P14–P18 the rails are built — Codex content, XP ledger, Council, Trader OS, paper trades. Live audit (today) reveals the uncomfortable truth: **4 users, 0 quiz attempts, 0 closed paper trades, 0 playbooks, 0 screenshots, 0 council reviews.** The platform works. Nobody is using it.

Diagnosis: there is no path from landing → first action. `OnboardingWizard` exists in the codebase but is never imported. The Index dashboard shows watchlists and stats but doesn't tell a brand-new user *what to do next*. The Codex catalog is still 13/20 published, 10/20 complete — the missing rows quietly break the "5 tracks × 4 modules" promise on `/learn`.

P19 fixes both at once: **finish the catalog, then build a first-session ritual that guarantees one closed trade, one completed lesson, and one Council preview within the first 15 minutes.**

## Goals

1. Catalog reaches 20/20 complete. No partials, no missing slugs, no half-rendered cards on `/learn`.
2. Every new user is funnelled through a 4-step Initiation that ends with their first XP awarded.
3. The Index dashboard ("Atrium") shifts from data-display to **next-action prompt** based on user state.
4. The Council card on Sunday becomes a real notification, not just a route.

---

## Step 1 — Finish the catalog (final pass)

### 1a. Ship the missing 7 modules
Three partials need quiz/drill/scenario regenerated: `markets-01-order-types`, `markets-03-session-times`, `risk-02-risk-reward`. Four `craft-*` and `chart-02-trend-channels` and `mind-03-recency-bias`, `mind-04-tilt-recovery` need full generation. Extend `bulk-generate-codex` to accept `regenerate_partials: true` which targets any published row missing quiz/drill/scenario. Add an admin button on `/profile` ("Complete the Codex") that loops 3-at-a-time with progress feedback (current `force_regenerate` button does the work but gives no signal).

### 1b. Pre-seed remaining stubs
The P17 stub-upsert on `LEVEL_1_SPEC` should already cover the 5 missing slugs but live data shows they never landed. Verify the upsert runs on every invocation (not gated behind `force_regenerate`) and that `chart-02`, `mind-03`, `mind-04` stubs exist before generation begins.

### 1c. Acceptance: `/learn` shows 5 tracks × 4 modules with no "coming soon" placeholders, and the SQL check from P18 acceptance returns 20.

## Step 2 — The Initiation (Μύησις) — first-session ritual

A 4-step guided flow shown once per user, dismissible but persistent until completed. Replaces the dead `OnboardingWizard`.

### 2a. Trigger
On first login after signup (no `profiles.onboarded_at`), redirect to `/initiation` instead of `/`. Skippable via a small "Enter the Stoa unguided" link, but skipping flips `onboarded_at` so they don't get pestered.

### 2b. The four steps
Each is a full-screen `StoaShell` panel with `PedimentCap` heading in Greek + English. Progress bar uses Greek numerals (Α' → Δ').

  1. **Α' — The Oath** — pick experience (Novice / Apprentice / Initiate), pick primary asset (Stocks / Crypto / Forex), state one goal in your own words. Saves to `profiles` (already has the columns).
  2. **Β' — The First Reading** — auto-launches `mind-01-four-biases` (the shortest, highest-impact lesson) inside the initiation flow. Reduced quiz threshold (50% to pass) just for the initiation lesson. On completion, awards 30 XP via `award_xp` with source `initiation` — proves the loop fires.
  3. **Γ' — The First Trade** — guided paper trade. Pre-fills a thesis on AAPL (or BTC if user picked crypto) using a built-in playbook ("The Apprentice's Breakout"). User confirms size (locked at 1% risk), SL, TP. Trade opens; we mark it with `meta.initiation = true`. Closes immediately at current price + small simulated drift to demonstrate the close flow and the screenshot prompt.
  4. **Δ' — The Council Preview** — synthetic Council card showing what one week of activity *would* look like, with a real "Adopt thy first decree" CTA that writes a starter Rulebook entry.

### 2c. Database
One migration: `alter table profiles add column onboarded_at timestamptz`. Seed one row in `playbooks` per user during step Γ' so the selector is non-empty forever after. No new tables.

### 2d. Acceptance
- A fresh signup lands on `/initiation`, completes all four steps, ends on `/` with: `xp_ledger` row (source=`initiation`), one `paper_trades` row (status=`closed`, `meta->>'initiation'='true'`), one `playbooks` row, one `rulebook` row, `profiles.onboarded_at` set.

## Step 3 — The Atrium (Index reborn as next-action prompt)

`Index.tsx` today is a stat dashboard for users who already have data. New users see a wall of dashes. Restructure into a state-aware single-prompt Atrium.

### 3a. The Hero Prompt
Top of `/`. One card, one CTA, computed from user state in this priority order:

  1. Council ready → "The Council awaits. Hear thy verdict." → `/council`
  2. Open paper trade with no thesis → "An untethered position. Anchor it." → `/demo-trading`
  3. Closed paper trade with no review → "Review thy last trade." → `/review`
  4. Codex module ≥50% with quiz unattempted → "Finish the lesson, take the test." → `/learn/:slug`
  5. No closed trade in 7d → "The hand grows cold. Open a paper trade." → `/demo-trading`
  6. Default: "Today's Codex reading awaits." → next incomplete module

### 3b. Demote the existing widgets
Watchlist, ticker marquee, daily missions, DQS, smart alerts move into a collapsible "The Forum" section below the hero. Existing components reused, no rewrites.

### 3c. Trader OS Strip
Reuse `TraderOSStrip.tsx` from P18 on the dashboard sidebar (currently only on Demo Trading). One file change.

## Step 4 — Council as a real ritual

### 4a. Sunday banner
A `<CouncilBanner>` on Index that appears Sunday after 18:00 local until viewed (one row per week in `council_reviews`). Stoic phrasing, one click to `/council`.

### 4b. Email-style in-app notification
Use the existing `NotificationPanel`. On Sunday, insert a `notifications` row "The Council convenes" linking to `/council`. Dismissed when the council review is viewed.

### 4c. Decree adoption count
On `/council`, show a small "X traders adopted this decree this week" counter (computed from `rulebook` entries with `source='council'`) — social proof without violating user privacy.

---

## Technical notes

- `bulk-generate-codex` already supports `force_regenerate: string[]`. Add a sibling `regenerate_partials: boolean` branch that queries `where is_published and (quiz_json is null or drill_json is null or scenario_json is null)` and feeds those slugs into the same generation loop. Keep batch size 3 to stay under the 150s edge timeout.
- `/initiation` is one new route + one new page (`src/pages/Initiation.tsx`) composed of four sub-step components. Reuse `LessonDetail`, `QuizFlow`, `ThesisBuilder`, `Council.tsx` panels — no new design language.
- `award_xp` source `initiation` is just a string; no enum migration needed.
- Atrium hero: pure client-side state computation in `useMemo` from existing queries. No new edge function.
- `CouncilBanner`: reuse `council_reviews` table; existing edge function caches the AI summary so showing the banner is free.
- Admin "Complete the Codex" button: use the same `bulk-generate-codex` with progress polling against `learn_modules` count of complete rows. No new infra.

## Out of scope (intentionally)

- No new design tokens, no new fonts, no new bottom-nav.
- No paid tier, no payments, no analytics rebuild.
- No changes to `xp_ledger`, `paper_trades`, `learn_modules` schemas.
- No social/community changes (Community page stays as-is).
- No mobile redesign — the Initiation works at 480px because it's single-column.

## Acceptance

1. `select count(*) from learn_modules where is_published and length(content_md)>100 and quiz_json is not null and drill_json is not null and scenario_json is not null` returns **20**.
2. A new account, taken end-to-end through Initiation, produces: `profiles.onboarded_at` set, ≥1 `xp_ledger` row with `source='initiation'`, ≥1 closed `paper_trades` row, ≥1 `playbooks` row.
3. Index `/` for that account now shows the Atrium hero with priority-3 prompt ("Review thy last trade") and the Trader OS strip with non-zero counts.
4. On a Sunday after 18:00 local, the Council banner appears on `/` until clicked; clicking it opens `/council` and the banner disappears for the week.
