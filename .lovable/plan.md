# Unified Plan: Mobile Navigation Fix + Watchlist Fix + Profile Page + Market-Driven Next Add-On

## What I found

- **Mobile navigation issue:** `PageShell.tsx` shows only `BottomNav` on mobile, and `BottomNav.tsx` currently hardcodes just 5 items: Home, Analysis, Demo, Tracker, Learn. That is why the rest of the desktop routes are inaccessible on mobile.
- **Watchlist issue:** the database now has the needed watchlist policies and a `(user_id, symbol)` uniqueness rule, so the remaining problem is likely the **client save flow** in `Analysis.tsx`. It uses a blind `upsert()` with no verification/refetch, so failures are hard to diagnose and success is not reflected reliably.
- **Profile page:** there is currently **no `/profile` route/page**, but the backend already has useful profile fields (`display_name`, `trading_personality`, `preferred_broker`, `experience_level`, `preferred_assets`, `trading_goals`, `xp_total`, `streak_count`, `paper_balance`, `trading_level`).
- **Market research direction:** based on current trading-product trends, the strongest demand is not “more indicators” first — it is **journaling + review + coaching + automation**. Traders want one place that connects learning, execution, psychology, and performance review.

## Implementation plan

### 1. Fix mobile navigation properly

Replace the current 5-item-only mobile nav with a structure that keeps the app usable on small screens.

**Build**

- Keep a compact bottom bar with the most-used tabs:
  - Home
  - Analysis
  - Demo Trading
  - Learn
  - More
- Add a **More** sheet/drawer that exposes all remaining routes:
  - Charts
  - Screener
  - Daily Picks
  - Tracker
  - Portfolio
  - Insights
  - Community
  - Profile
  - Sign Out
- Mirror desktop information architecture so users do not feel like mobile is a different app.
- Highlight the active route in both bottom bar and More sheet.
- Make Profile accessible from mobile without hunting through hidden UI.

**Why this approach**

- 10+ icons in a bottom bar is poor mobile UX.
- A “More” drawer is the cleanest way to expose all routes without crowding.

---

### 2. Fix watchlist saving end-to-end

Make watchlist saving deterministic instead of relying on a fragile blind upsert path.

**Build**

- In `Analysis.tsx`, replace the current watchlist save with:
  1. normalize symbol
  2. check if it already exists for the logged-in user
  3. if missing → insert
  4. if existing → show “Already saved” or update metadata deliberately
- Add explicit loading state on the button:
  - `Add to Watchlist`
  - `Saving...`
  - `Saved`
- After success:
  - refresh local watchlist state
  - optionally dispatch a lightweight refresh event so dashboard/ticker/watchlist widgets update immediately
- Improve error handling:
  - show exact backend error if insert fails
  - block action if user/session/result is missing
- Add a quick verification query after save so the UI only shows success when the row actually exists.

**Likely root cause addressed**

- The schema is now ready, so the remaining failure is most likely the client flow not confirming save state and not handling duplicates clearly.

---

### 3. Add a full Profile page

Create a dedicated profile/settings area using the data already stored in the app.

**Profile page sections**

1. **Profile header**
  - avatar from auth metadata
  - display name
  - email (read-only)
  - experience level
  - trading level badge
2. **Learning & trading progress**
  - XP total
  - streak count
  - completed lessons
  - completed drills
  - paper balance
  - total paper trades / win rate snapshot
3. **Preferences**
  - trading personality
  - preferred broker
  - preferred assets
  - trading goals
4. **Account & app controls**
  - onboarding preferences edit
  - reset paper balance action
  - sign out
  - future placeholder for notification preferences / privacy settings

**Build**

- Add route: `/profile`
- Add page file: `src/pages/Profile.tsx`
- Add navigation entry:
  - desktop sidebar
  - mobile More sheet
- Reuse existing components where possible:
  - `PersonalitySelector`
  - existing stat/glass card patterns
- Fetch from:
  - `profiles`
  - `learning_progress`
  - `practice_progress`
  - `paper_trades`

---

### 4. Unify profile + mobile nav + watchlist UX

These should feel connected, not like isolated fixes.

**Build**

- Add a watchlist summary card to Profile:
  - recent saved symbols
  - count by asset type
- Add “Go to Analysis” and “Manage Watchlist” actions from Profile
- Make the dashboard/profile/watchlist states refresh from the same save events so users see changes instantly
- Ensure the same nav labels/icons are used across desktop and mobile

---

## Market research: what traders need most next

## Research summary

Across modern trading apps, journals, and simulator products, the strongest recurring needs are:

1. **Less manual logging**
  - traders hate entering trade data repeatedly
  - manual journaling kills consistency
2. **Performance review that leads to action**
  - not just P&L charts
  - users want mistake patterns, best setups, weak sessions, emotional leaks
3. **Psychology + behavior tracking**
  - emotions, impulsive trades, revenge trades, over-sizing
  - this is increasingly treated as core, not optional
4. **Learning tied to actual trades**
  - users want lessons that react to what they did wrong
  - “academy” and “simulator” work best when linked
5. **Playbooks and repeatable setups**
  - advanced traders want setup libraries, tags, screenshots, checklists
  - beginners want guided templates

## Best next big add-on: Trade Journal + Playbook + Review Hub

The strongest next major feature for this product is a **unified trader operating system** layer, not another isolated tool.

### Recommended product concept

**AI Review Hub / Trader OS**

### Why this is the best next move

Your app already has:

- analysis
- demo trading
- learning
- tracker
- insights
- community

What it still lacks is the **system that turns activity into improvement**.

That means a next add-on focused on:

- trade capture
- screenshots
- tags/setups
- post-trade review
- weekly coaching
- mistake clustering
- playbook building

### Suggested feature set

1. **Auto Journal**
  - CSV import first
  - later broker sync
  - auto-fill symbol, side, entry, exit, P&L
2. **Playbook Builder**
  - save setups like breakout, pullback, mean reversion
  - attach checklist, ideal conditions, invalidation, examples
3. **Screenshot Vault**
  - pre-trade and post-trade chart screenshots
  - annotate what the trader saw vs what happened
4. **Review Workspace**
  - best/worst setup reports
  - mistake tags
  - win rate by setup / session / asset type
  - emotional pattern breakdown
5. **Weekly Coaching Report**
  - “what improved”
  - “what is leaking money”
  - “one rule for next week”
  - lesson recommendations linked to actual mistakes
6. **Accountability Loop**
  - review streaks
  - “3 trades pending review”
  - mission system tied to real behavior

### Why this beats other add-ons right now

- Higher retention than adding more discovery tools
- Better monetization potential than a pure social feature
- Strong fit with your existing lesson/demo/analysis stack
- Creates a daily habit loop

---

## Technical details

### Files likely affected

- `src/components/BottomNav.tsx`
- `src/components/PageShell.tsx`
- `src/components/SideNav.tsx`
- `src/App.tsx`
- `src/pages/Analysis.tsx`
- `src/pages/Profile.tsx` (new)
- optional new mobile nav helper:
  - `src/components/MobileMoreNav.tsx`
- optional profile subcomponents:
  - `src/components/profile/ProfileHeader.tsx`
  - `src/components/profile/ProfileProgress.tsx`
  - `src/components/profile/ProfilePreferences.tsx`
  - `src/components/profile/ProfileWatchlist.tsx`

### Data sources

- `profiles`
- `watchlist`
- `learning_progress`
- `practice_progress`
- `paper_trades`

### No risky backend redesign needed

- Mobile nav and profile page are frontend additions
- Watchlist fix should be solvable mainly in frontend logic
- Existing profile schema already supports a useful first version

## Recommended build order

1. Rework mobile navigation with a More drawer
2. Add `/profile` route and page
3. Fix watchlist save flow with explicit insert/check/refresh logic
4. Wire profile/watchlist/dashboard refresh behavior together
5. After that, start the next major add-on:
  - Auto Journal + Playbook + Review Hub

## Expected outcome

After this build:

- mobile users can access the full app
- watchlist saving becomes reliable and visibly confirmed
- users get a proper profile/settings area
- the product gets a clearer roadmap toward a differentiated, high-retention trader platform centered on review, discipline, and improvement  
  
implement all with new features too