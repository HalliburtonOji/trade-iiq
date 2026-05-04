# Fix: Sophos in nav + finish the living-trader spec

Two real problems to fix:

1. **"No mentor on sidebar"** — `SideNav` has Sophos, but every Stoa-styled page (including `/mentor`, `/oracle`, etc.) renders inside `StoaShell`, whose own `NAV` array (the drawer on mobile, the rail on desktop) does **not** include Sophos. That's why you don't see it.
2. **"All we talked about is not built"** — the original P23 spec promised six components: MentorHero, MentorTradeCard, MentorIntentCard, MentorJournalFeed, **MentorPulse**, **MentorVsYou**. Only the first four exist. There's also no dedicated PAST view, no "watch / alert me" on intents, and no visible heartbeat status so users can't tell Sophos is actually alive.

## What gets built

### 1. Put Sophos in the actual shell nav
- `src/components/stoa/StoaShell.tsx` — add `{ kicker: "SOPHOS", greek: "Σοφός", to: "/mentor" }` at the top of the GROW section (right under ORACLE). This is the change that makes Sophos appear in the drawer on mobile and the side rail on desktop.

### 2. Add a PAST tab + proper closed-trade timeline
- `src/pages/Mentor.tsx` — change tabs from NOW/NEXT/JOURNAL to **NOW / NEXT / PAST / JOURNAL** (Παρόν · Μέλλον · Παρελθόν · Βίβλος). Stop dumping closed trades under NOW.
- New `src/components/mentor/MentorPastList.tsx` — chronological list of closed trades grouped by week, each showing entry/exit, P&L, and the original thesis + Sophos's reflection inline. Cards reuse `MentorTradeCard closed`.

### 3. Build the missing components

**`src/components/mentor/MentorPulse.tsx`** (rendered above the tabs)
- Shows last `mentor_tick` time + countdown to next tick (5min during US session 13:30–20:00 UTC, else 30min).
- Status pill: "Awake · scanning" / "Resting · off-session".
- Subscribes to `mentor_journal` realtime — pulses gold when a new entry arrives.
- If last tick > 15 min ago in-session, shows "Heartbeat stalled" warning (helps surface broken cron).

**`src/components/mentor/MentorVsYou.tsx`** (rendered on the NOW tab, below hero)
- Pulls caller's `paper_trades` aggregate stats vs `mentor_profile` stats.
- Three-column row: Win rate · Avg R · Equity curve %. Each cell shows "You / Sophos / Δ".
- Plain-English takeaway underneath ("Sophos holds losers 2× shorter than you do").

### 4. Intent improvements
- `MentorIntentCard.tsx` — add a second action next to "Copy this plan": **"Alert me when triggered"** which writes to a new lightweight `mentor_intent_watchers (user_id, intent_id)` table. When `mentor-tick` flips an intent to `triggered`, it inserts a row into the existing `notifications` flow for each watcher.
- Show `valid_until` countdown and `trigger_condition_text` more prominently.

### 5. Verify the heartbeat actually runs
- Read `mentor_profile`, `mentor_journal`, `mentor_trades` rows to confirm the cron job from `20260504015405_*.sql` is firing. If empty, either the cron payload is malformed or `mentor-tick` is erroring.
- Check edge function logs for `mentor-tick`. If broken, fix it (most likely culprit: missing `LOVABLE_API_KEY` env reference or Gemini schema rejection).
- If the table is still empty after a fix, manually invoke `mentor-tick` once so the user sees Sophos populated immediately.

## Database

```sql
create table public.mentor_intent_watchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  intent_id uuid not null references public.mentor_intents(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, intent_id)
);
alter table public.mentor_intent_watchers enable row level security;
create policy "own watchers select" on public.mentor_intent_watchers for select using (auth.uid() = user_id);
create policy "own watchers insert" on public.mentor_intent_watchers for insert with check (auth.uid() = user_id);
create policy "own watchers delete" on public.mentor_intent_watchers for delete using (auth.uid() = user_id);
```

Then patch `mentor-tick` (the RESOLVE phase) to insert notifications for watchers when an intent triggers.

## Out of scope
- Multiple personas — still one Sophos.
- Real-money copy — paper book only.
- Voice / audio reflections.

## Files touched
- edit: `src/components/stoa/StoaShell.tsx`, `src/pages/Mentor.tsx`, `src/components/mentor/MentorIntentCard.tsx`, `supabase/functions/mentor-tick/index.ts`
- new: `src/components/mentor/MentorPulse.tsx`, `src/components/mentor/MentorVsYou.tsx`, `src/components/mentor/MentorPastList.tsx`
- new migration: `mentor_intent_watchers` table + RLS
