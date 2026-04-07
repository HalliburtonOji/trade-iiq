

# Floating Nav Hub + Trader OS Features

## 1. Replace BottomNav with Floating Nav Hub

**Current state**: Two overlapping nav elements on mobile -- a bottom bar (Home, Analysis, Demo, Learn, More) and a floating chat bubble. Redundant.

**Change**: Remove `BottomNav` entirely. Refactor `AIChatbot.tsx` into a unified floating hub with a hamburger icon (`Menu` / three-dash). When tapped, it opens a bottom sheet with two tabs:

- **Navigate tab**: Grid of ALL routes (Home, Analysis, Demo Trading, Learn, Charts, Screener, Daily Picks, Tracker, Portfolio, Insights, Community, Profile) + Sign Out. Active route highlighted.
- **AI Coach tab**: The existing streaming chatbot, unchanged.

**Files**:
- `src/components/AIChatbot.tsx` -- full rewrite into `FloatingHub.tsx` (or rename in place). Hamburger icon FAB, Sheet with tabs for Nav + Chat.
- `src/components/BottomNav.tsx` -- delete
- `src/components/PageShell.tsx` -- remove BottomNav import/render on mobile; remove `pb-20` since no bottom bar. Keep SideNav for desktop.
- `src/App.tsx` -- update import if component is renamed

**UX**: FAB sits bottom-right. On mobile, no bottom bar at all -- just the floating button. Desktop keeps SideNav + floating button (chat only, no nav grid needed on desktop since SideNav exists).

---

## 2. Database Migration -- New Tables

Three new tables needed for the Trader OS features:

**`playbooks`** -- stores repeatable setup templates
- `id`, `user_id`, `name`, `strategy_type` (breakout/pullback/mean-reversion/custom), `checklist` (jsonb array), `conditions` (jsonb), `invalidation_rules` (text), `example_screenshots` (text[] -- storage URLs), `notes`, `created_at`, `updated_at`
- RLS: user owns their playbooks (SELECT/INSERT/UPDATE/DELETE)

**`screenshot_vault`** -- pre/post trade chart screenshots with annotations
- `id`, `user_id`, `trade_id` (nullable ref to paper_trades), `symbol`, `image_url`, `annotation` (text), `phase` (pre_trade/post_trade/general), `tags` (text[]), `created_at`
- RLS: user owns their screenshots

**`accountability_streaks`** -- tracks review streaks and accountability
- `id`, `user_id`, `current_streak`, `longest_streak`, `last_review_date`, `pending_reviews` (integer), `updated_at`
- RLS: user owns their streak data

No new tables needed for Review Workspace or Weekly Coaching -- those are computed views over existing `paper_trades`, `decision_reviews`, `trade_decisions`, and `trading_dna` tables, plus the existing `weekly-digest` edge function.

---

## 3. Playbook Builder

New page component at `/playbook` (or section within Demo Trading / Tracker).

**Features**:
- Create/edit/delete playbooks
- Each playbook has: name, strategy type selector, checklist items (add/remove/reorder), entry/exit conditions (text fields), invalidation rules, notes
- Attach example screenshots from Screenshot Vault
- When opening a new paper trade in Demo Trading, user can select a playbook to pre-fill thesis

**Files**:
- `src/pages/Playbook.tsx` (new) -- list view + create/edit form
- `src/components/playbook/PlaybookCard.tsx` -- display card
- `src/components/playbook/PlaybookForm.tsx` -- create/edit form with checklist builder
- Add route in `App.tsx`, add to nav items

---

## 4. Screenshot Vault

**Features**:
- Upload chart screenshots (pre-trade / post-trade) to existing `chart_screenshots` storage bucket
- Add text annotations and tags
- Link to a specific paper trade (optional)
- Gallery view with filter by symbol, phase, tags
- View screenshot with overlay annotation

**Files**:
- `src/pages/ScreenshotVault.tsx` (new) or section within existing pages
- `src/components/vault/ScreenshotUpload.tsx` -- upload + annotate form
- `src/components/vault/ScreenshotGallery.tsx` -- filterable grid
- Add route, add to nav

---

## 5. Review Workspace

Computed dashboard pulling from existing tables -- no new backend tables needed.

**Features**:
- Best/worst setup reports (aggregate `paper_trades` by `thesis_json.strategy`)
- Mistake tags breakdown (from `decision_reviews.mistake_type`)
- Win rate by: setup type, session time, asset type
- Emotional pattern breakdown (from `paper_trades.emotion` + `decision_reviews.emotion`)
- "Trades pending review" counter -- paper trades with no matching decision_review

**Files**:
- `src/pages/ReviewWorkspace.tsx` (new)
- `src/components/review/SetupReport.tsx`
- `src/components/review/MistakeBreakdown.tsx`
- `src/components/review/EmotionalPatterns.tsx`
- `src/components/review/PendingReviews.tsx`
- Add route, add to nav

---

## 6. Weekly Coaching Report

Extend the existing `weekly-digest` edge function output. Add a new page/component to display it.

**Features**:
- "What improved this week" (compare current vs previous week stats)
- "What's leaking money" (top mistake types, worst setups)
- "One rule for next week" (AI-generated from digest data)
- Lesson recommendations linked to actual mistakes
- The existing edge function already generates `ai_focus` -- extend the prompt to produce structured coaching sections

**Files**:
- `src/components/review/WeeklyCoachingReport.tsx` (new) -- fetches from `weekly-digest` edge function, renders structured report
- `supabase/functions/weekly-digest/index.ts` -- extend AI prompt to return structured coaching JSON (what_improved, money_leak, next_rule, recommended_lessons)
- Surface in Review Workspace or as standalone tab

---

## 7. Accountability Loop

**Features**:
- Review streak tracking (consecutive days with at least one trade review)
- "X trades pending review" badge/notification
- Mission system tied to real behavior: "Review 3 trades", "Write 1 post-mortem", "Update your playbook"
- Streak display on Profile page and Review Workspace

**Files**:
- `src/components/review/AccountabilityWidget.tsx` -- streak display, pending count, missions
- Integrate into Profile page and Review Workspace
- Update `DailyMissions` data to include review-based missions

---

## Build Order

1. **Floating Nav Hub** -- refactor AIChatbot into nav+chat hub, delete BottomNav, update PageShell
2. **Database migration** -- create `playbooks`, `screenshot_vault`, `accountability_streaks` tables with RLS
3. **Playbook Builder** -- page + components
4. **Screenshot Vault** -- page + upload + gallery
5. **Review Workspace** -- computed dashboard from existing data
6. **Weekly Coaching Report** -- extend edge function + display component
7. **Accountability Loop** -- streak tracking + review missions
8. **Wire into nav** -- add all new routes to floating hub nav grid and desktop SideNav

