# P17 — Τελείωσις (Completion): Finish the Codex Loop

After P14–P16 the foundations are in place but production is in a half-built state. Three concrete gaps to close, in order of user impact.

## Current state (verified live)

- **Catalog**: 14 of 20 Level-1 modules exist. 3 have prose but no drill/quiz/scenario (`markets-01`, `markets-03`, `risk-02`). 5 are entirely missing (`chart-02-trend-channels`, all 4 `craft-*`).
- **XP ledger**: 7 rows total. Sources firing: `drill`, `scenario`, `daily_mission`, `trading_mission`. **Zero rows from `lesson` or `quiz`** — meaning no user has passed a Codex quiz since P15 launch, so the leaderboard reflects almost nothing.
- **Trader OS**: `playbooks` and `screenshot_vault` tables exist with RLS but **0 rows ever**. Pages exist at `/playbook` and `/screenshot-vault` but have no entry point from the Demo Trading flow where they would naturally be used.
- **Surfacing**: `/learn` still leads with the legacy static `lessonsData.ts` cards. New Stoa Codex modules are reachable but not the front door.

## Goals

1. Finish the catalog so the bulk-gen button completes cleanly to 20/20.
2. Make sure the lesson→quiz→XP loop actually fires (diagnose the zero-row gap).
3. Bring the Trader OS shells to life by hooking them into Demo Trading.
4. Make the Codex the front door of `/learn`.

---

## Step 1 — Catalog completion

**Diagnose why `craft-*` and `chart-02` are missing despite bulk-gen running.** The most likely cause is that `bulk-generate-codex` only inserts modules whose slugs already exist as rows in `learn_modules`; the 5 missing slugs were never seeded.

Two-part fix in `supabase/functions/bulk-generate-codex/index.ts`:
- Before generating, upsert a stub row for every spec in `LEVEL_1_SPEC` (track, level, slug, title_en, title_gr, ordinal, `is_published=false`).
- Then proceed with the existing batched generation. Skip rule unchanged: skip when content_md > 100 AND drill_json AND quiz_json AND scenario_json.

The 3 partials (`markets-01`, `markets-03`, `risk-02`) will be picked up automatically because they fail the skip check. The 5 missing slugs will now exist as stubs and get generated.

Add a `force_regenerate?: string[]` body param so the admin button can target specific slugs if a generation goes sideways.

## Step 2 — Diagnose the silent quiz/lesson XP gap

The code in `LearnModule.tsx` (lines 285–297) does call `award_xp` with sources `quiz` and `lesson`, but ledger has zero such rows. Three things to check, in order:

1. **`award_xp` RPC permissions** — verify the function is `SECURITY DEFINER` and grants `EXECUTE` to `authenticated`. If it silently fails on `auth.uid()` resolution, the front-end never sees an error. Check via `supabase--read_query` against `pg_proc` and `information_schema.routine_privileges`.
2. **Quiz passing threshold** — `pass_score` defaults to 70 and quizzes are 4–5 questions, so a single wrong answer can drop below 70. Verify with `quiz_attempts` table whether attempts are being logged at all, and at what scores.
3. **Module ID match** — confirm `mod.id` is a real `learn_modules.id` UUID at the moment `award_xp` is called (not the slug).

Wire a small dev-only `console.error` on the `await supabase.rpc("award_xp", …)` calls in `LearnModule.tsx`, `LearnDrill.tsx`, `LearnScenario.tsx` to surface RPC errors in the browser console for the next session. Remove after one successful end-to-end pass.

If the RPC turns out to be the issue, ship a migration that recreates `award_xp` with the correct definer/grant and inserts a `lesson_complete` taxonomy row.

## Step 3 — Hook Trader OS into Demo Trading

The pages exist (`Playbook.tsx`, `ScreenshotVault.tsx`, `ReviewWorkspace.tsx`) but nothing in the Demo Trading flow points to them, so users never discover them.

Three small wiring changes in `src/pages/DemoTrading.tsx` and `src/components/demo/ThesisBuilder.tsx`:

- **Thesis Builder**: when opening a new paper trade, show a "Load from Playbook" select sourced from `playbooks` where `user_id = auth.uid()`. Selecting one pre-fills the strategy, checklist, and invalidation fields.
- **Trade Review**: after closing a trade, add an "Attach screenshot" button that opens `ScreenshotUpload` pre-bound to the just-closed `trade_id`.
- **Empty-state CTAs**: on `/playbook` and `/screenshot-vault`, when the table is empty, show a single Stoa-styled card linking to "Create your first" — currently the empty state is a blank panel.

No new tables. No new XP sources. Just wiring.

## Step 4 — Codex as the front door of `/learn`

In `src/pages/Learn.tsx`, restructure the tab order so the Stoa Codex (the new `learn_modules` content with diagrams, drills, quizzes, scenarios) is the first/default tab. The legacy `lessonsData.ts` content moves to a "Quick Lessons" tab kept for users who started before P14.

Render the Codex tab as a 5-column grid of tracks (markets, chart, risk, mind, craft) with a folio strip showing Greek-numeral progress (Αʹ Βʹ Γʹ Δʹ) per track, sourced from `learn_progress` joined with `learn_modules`. Each card links to `/learn/module/:slug`.

No new components needed beyond a `CodexTrackCard.tsx` — reuses the Stoa palette and `greek-numerals.ts` from P16.

---

## Technical notes

- Stub upsert in bulk-gen uses `onConflict: "slug"` since slug is unique.
- `award_xp` RPC signature confirmed: `(p_amount, p_source, p_ref_id, p_ref_table)`.
- Diagnostic logging is **strictly temporary** — remove in the same patch once one end-to-end pass is verified, no leftover console noise.
- `craft-*` modules introduce the Trader OS concepts the user is about to encounter — natural pairing with Step 3's wiring.
- No schema changes required if Step 2 turns out to be a quiz threshold or front-end issue rather than RPC permissions.

## Acceptance

1. Admin "Generate Catalog" button finishes with 20 generated, 0 failed; `select count(*) from learn_modules where is_published=true` returns 20.
2. After one user passes one Codex quiz, `select count(*) from xp_ledger where source in ('lesson','quiz')` is ≥ 2.
3. Creating a paper trade in Demo Trading shows a Playbook selector when at least one playbook exists.
4. `/learn` opens with the Codex tab active by default; each track card shows a Greek-numeral progress strip.
