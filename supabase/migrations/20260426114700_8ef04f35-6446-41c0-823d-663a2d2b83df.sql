-- Drop existing views if any to allow shape change
drop view if exists public.leaderboard_7d cascade;
drop view if exists public.leaderboard_30d cascade;
drop view if exists public.leaderboard_alltime cascade;

create view public.leaderboard_30d
with (security_invoker = true)
as
select
  p.user_id,
  coalesce(nullif(p.display_name, ''), 'Anonymous') as display_name,
  coalesce(sum(x.amount) filter (where x.awarded_at >= now() - interval '30 days'), 0)::int as xp_window,
  coalesce(p.xp_total, 0) as xp_total,
  coalesce(p.streak_count, 0) as streak_count,
  coalesce(p.level, 'Novice') as level,
  count(distinct date_trunc('day', x.awarded_at)) filter (where x.awarded_at >= now() - interval '30 days') as active_days
from public.profiles p
left join public.xp_ledger x on x.user_id = p.user_id
group by p.user_id, p.display_name, p.xp_total, p.streak_count, p.level;

create view public.leaderboard_7d
with (security_invoker = true)
as
select
  p.user_id,
  coalesce(nullif(p.display_name, ''), 'Anonymous') as display_name,
  coalesce(sum(x.amount) filter (where x.awarded_at >= now() - interval '7 days'), 0)::int as xp_window,
  coalesce(p.xp_total, 0) as xp_total,
  coalesce(p.streak_count, 0) as streak_count,
  coalesce(p.level, 'Novice') as level,
  count(distinct date_trunc('day', x.awarded_at)) filter (where x.awarded_at >= now() - interval '7 days') as active_days
from public.profiles p
left join public.xp_ledger x on x.user_id = p.user_id
group by p.user_id, p.display_name, p.xp_total, p.streak_count, p.level;

create view public.leaderboard_alltime
with (security_invoker = true)
as
select
  p.user_id,
  coalesce(nullif(p.display_name, ''), 'Anonymous') as display_name,
  coalesce(p.xp_total, 0) as xp_window,
  coalesce(p.xp_total, 0) as xp_total,
  coalesce(p.streak_count, 0) as streak_count,
  coalesce(p.level, 'Novice') as level,
  count(distinct date_trunc('day', x.awarded_at)) as active_days
from public.profiles p
left join public.xp_ledger x on x.user_id = p.user_id
group by p.user_id, p.display_name, p.xp_total, p.streak_count, p.level;

grant select on public.leaderboard_7d, public.leaderboard_30d, public.leaderboard_alltime to authenticated;