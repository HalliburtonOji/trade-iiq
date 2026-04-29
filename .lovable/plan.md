# P18 — Λειτουργία (Operation)

After P14–P17 the rails are in. Live audit (2026-04-29) shows the platform is still pre-loop: only one paper trade exists, zero playbooks, zero screenshots, zero quiz attempts. The next big build is the **operating ritual** — content fully filled in, lessons that bend back into Demo Trading, and a weekly Council review that closes the loop and gives users a reason to come back.

## Verified live state

- `learn_modules`: 14 rows. **6 incomplete:** `markets-01`, `markets-03`, `risk-02` (prose only), plus `chart-02-trend-channels` and all 4 `craft-*` are missing entirely. One stray duplicate (`mind-01-bias-basics`).
- `xp_ledger`: 7 rows, sources `drill`, `scenario`, `daily_mission`, `trading_mission`. Still **zero `lesson` / `quiz` rows.**
- `quiz_attempts`: 0 rows ever — no one has finished a Codex quiz.
- `paper_trades`: 1 row. `playbooks`: 0. `screenshot_vault`: 0.
- Diagnostic `console.error` from P17 still in three Learn pages.

## Goals

1. Catalog hits 20/20 published-and-complete (no half-modules, no duplicate slugs).
2. The lesson→quiz→XP path actually fires end-to-end and the diagnostics get pulled out.
3. Trader OS becomes part of the trade flow, not three orphan pages.
4. A weekly **Council** ritual replaces the dead-end profile page with a real "what did this week say about you" review.

---

## Step 1 — Finish the catalog (cleanup + force-regen)

### 1a. Remove duplicate slug
Migration to delete `mind-01-bias-basics` (legacy, superseded by `mind-01-four-biases`) and any `learn_progress` rows pointing to it.

### 1b. Force-regenerate the 6 incomplete modules
The `bulk-generate-codex` skip rule is correct, but the 3 partials (`markets-01`, `markets-03`, `risk-02`) have prose long enough that generation will overwrite them. The 5 missing slugs (`chart-02`, `craft-01..04`) get stub-upserted by P17's pre-seed and then generated.

Add a one-shot admin button on `/profile` ("Force regenerate incomplete") that calls `bulk-generate-codex` with `force_regenerate: ["markets-01-order-types","markets-03-session-times","risk-02-risk-reward","chart-02-trend-channels","craft-01-what-is-playbook","craft-02-trade-journal","craft-03-review-rituals","craft-04-pattern-of-one"]` and loops batched calls (3 per call) until `done:true`.

### 1c. Acceptance check in UI
After bulk-gen finishes, `/learn` shows 5 tracks × 4 modules = 20 cards, each with a Greek-numeral progress strip, no "stub" placeholders.

## Step 2 — Close the lesson→XP loop

### 2a. Diagnose & fix the silent failure
Likely cause given zero `quiz_attempts`: the front-end never gets to the quiz because `LearnModule.tsx` only advances to the quiz step after the lesson is marked complete, and `LessonDetail`'s "complete" CTA may not be firing the right state path for Codex modules (vs. legacy lessons). Read `LearnModule.tsx`, `QuizFlow.tsx`, and the `award_xp` RPC definition once with the diagnostics on, fix whichever of these is broken:
  - `award_xp` permissions / `auth.uid()` resolution
  - quiz threshold (lower default `pass_score` to 60 for 4-question quizzes; round up)
  - the "complete lesson" CTA wiring on the new Stoa lesson layout

### 2b. Remove the diagnostic noise
Once one round-trip works in dev, remove the `console.error` blocks added in P17 from `LearnModule.tsx`, `LearnDrill.tsx`, `LearnScenario.tsx`. Replace with a single `toast.error` on RPC failure so future regressions are visible without console noise.

### 2c. Visible XP feedback
On successful `award_xp` for `lesson` or `quiz`, show a small "+N XP — Codex" toast with the Greek-numeral source label. Confirms the loop to the user and to us in QA.

## Step 3 — Trader OS lives inside Demo Trading

The Playbook and Screenshot Vault pages are correct but invisible. Three concrete wiring changes:

### 3a. Playbook quick-create from Thesis Builder
In `ThesisBuilder.tsx`, add a "Save as playbook" link below the form. When the user has filled reason + checklist, one click creates a `playbooks` row from the in-progress thesis. Future trades load it from the existing P17 selector. Closes the cold-start: a user makes their first playbook *during* their first paper trade, not on a separate page they'll never visit.

### 3b. Auto-prompt screenshot on trade close
In `DemoTrading.tsx`, when a trade is closed (TP/SL/manual), open the existing Trade Review sheet with an "Attach chart screenshot" file input pre-bound to that `trade_id`. Skippable. No new component — extend `TradeReview.tsx`.

### 3c. Trader OS strip on Demo Trading sidebar
Compact 3-card strip: "Playbooks (n)", "Screenshots (n)", "Reviews pending (n)". Each links to the existing page. Makes the Trader OS surface area discoverable without rebuilding the nav.

## Step 4 — The Council (weekly review ritual)

This is the new feature and the reason this whole patch matters. A weekly review page at `/council` (or `/profile?tab=council`) that gives the user one Sunday-evening artefact summarising the week.

### 4a. Data
No new tables. Aggregate from existing rows for the last 7 days:
  - paper_trades closed: count, win rate, best/worst trade, total pnl
  - playbooks used: count by `strategy_type`
  - xp_ledger: total + by source
  - quiz_attempts: count, avg score, weakest tag
  - rules violated: from existing rule-check edge function

### 4b. Component
New `src/pages/Council.tsx` using `StoaShell`. Five panels:
  1. **Verdict** — single sentence (e.g. "This week thy hand was steady but thy thesis weak."). Server-rendered via Lovable AI Gateway (`google/gemini-2.5-flash`) given the aggregate JSON.
  2. **Trades** — table with thesis adherence per trade, screenshot thumbnail, playbook tag.
  3. **Codex** — modules completed this week + weakest quiz tag with a "study this" CTA.
  4. **Discipline** — rules followed vs. violated, streak.
  5. **Next week's stoic decree** — one rule the AI suggests adopting next week, savable as a Rulebook entry.

### 4c. Trigger
Surface a "The Council awaits" card on `/profile` and `/` (Index dashboard) every Sunday after 18:00 local, persistent until viewed. One row per week in a tiny new table `council_reviews(user_id, week_starting, viewed_at, ai_summary, decree)` so the AI summary is cached per week and not regenerated on every view.

### 4d. Edge function
New `supabase/functions/council-summary/index.ts`. Pulls aggregates with service role for the calling user, calls Gemini 2.5 Flash with a tight Stoa-voiced prompt, upserts `council_reviews`, returns the row. Idempotent per (user, week).

---

## Technical notes

- Migration file order: cleanup duplicate slug → create `council_reviews` table with RLS (`user_id = auth.uid()`).
- `pass_score` default change is a one-line `alter table learn_modules alter column pass_score set default 60` — old rows keep their values; only new generations get the lower bar.
- `council-summary` reuses the Lovable AI Gateway client pattern from `generate-codex-module`.
- All new UI uses `StoaShell`, `PedimentCap`, `Meander`, `greek-numerals.ts` — no new design tokens.
- No changes to: `learn_modules` schema, `xp_ledger` schema, `paper_trades` schema, the Stoa visual system, `tradingMissions.ts`, the broker launcher.

## Acceptance

1. `select count(*) from learn_modules where is_published and length(content_md)>100 and drill_json is not null and quiz_json is not null and scenario_json is not null` returns **20**, and there is no `mind-01-bias-basics` row.
2. After completing one Codex lesson + quiz as a real user, `xp_ledger` has rows with `source in ('lesson','quiz')` and the `+N XP — Codex` toast fired.
3. Closing a paper trade opens the Trade Review with the screenshot input visible; saving a thesis as a playbook creates a `playbooks` row visible in the next trade's selector.
4. Visiting `/council` on a Sunday returns a cached AI verdict (second visit same week makes no Gemini call), shows all five panels populated from real data, and the suggested decree can be one-click saved into the Rulebook.
