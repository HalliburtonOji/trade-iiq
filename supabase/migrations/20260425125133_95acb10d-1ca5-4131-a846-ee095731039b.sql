-- xp_ledger: append-only record of every XP grant, keyed for idempotency
create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null check (amount > 0),
  source text not null check (source in (
    'lesson','drill','quiz','scenario',
    'paper_trade','daily_mission','trading_mission'
  )),
  ref_id text not null,
  ref_table text,
  awarded_at timestamptz not null default now(),
  unique (user_id, source, ref_id)
);

create index if not exists xp_ledger_user_idx on public.xp_ledger (user_id, awarded_at desc);

alter table public.xp_ledger enable row level security;

drop policy if exists "users read own ledger" on public.xp_ledger;
create policy "users read own ledger"
  on public.xp_ledger for select
  using (auth.uid() = user_id);

-- Track last activity for streak math
alter table public.profiles
  add column if not exists streak_last_active date;

-- The award function: idempotent, updates xp_total + streak_count atomically.
create or replace function public.award_xp(
  p_amount int,
  p_source text,
  p_ref_id text,
  p_ref_table text default null
)
returns table(awarded boolean, new_xp int, new_streak int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_last date;
  v_inserted_id uuid;
  v_xp int;
  v_streak int;
begin
  if v_user_id is null then
    return query select false, 0, 0;
    return;
  end if;

  insert into public.xp_ledger (user_id, amount, source, ref_id, ref_table)
  values (v_user_id, p_amount, p_source, p_ref_id, p_ref_table)
  on conflict (user_id, source, ref_id) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    -- Already awarded; return current values without touching streak
    select coalesce(xp_total,0), coalesce(streak_count,0)
      into v_xp, v_streak
      from public.profiles where user_id = v_user_id
      limit 1;
    return query select false, coalesce(v_xp,0), coalesce(v_streak,0);
    return;
  end if;

  -- Recompute xp_total from ledger (source of truth)
  update public.profiles
    set xp_total = (select coalesce(sum(amount),0) from public.xp_ledger where user_id = v_user_id)
    where user_id = v_user_id;

  -- Streak math
  select streak_last_active into v_last from public.profiles where user_id = v_user_id limit 1;
  if v_last is null or v_last < v_today then
    update public.profiles set
      streak_count = case
        when v_last = v_today - interval '1 day' then coalesce(streak_count,0) + 1
        else 1
      end,
      streak_last_active = v_today
      where user_id = v_user_id;
  end if;

  select coalesce(xp_total,0), coalesce(streak_count,0)
    into v_xp, v_streak
    from public.profiles where user_id = v_user_id limit 1;
  return query select true, coalesce(v_xp,0), coalesce(v_streak,0);
end;
$$;

grant execute on function public.award_xp(int, text, text, text) to authenticated;

-- Backfill XP for already-completed Codex modes. Idempotent thanks to UNIQUE.
insert into public.xp_ledger (user_id, amount, source, ref_id, ref_table)
select
  lp.user_id,
  case lp.mode
    when 'lesson' then coalesce(lm.xp_reward, 50)
    when 'drill'  then 25
    when 'quiz'   then 30
    when 'scenario' then 50
    else 0
  end,
  lp.mode,
  lp.module_id::text,
  'learn_modules'
from public.learn_progress lp
join public.learn_modules lm on lm.id = lp.module_id
where lp.status = 'completed'
  and lp.mode in ('lesson','drill','quiz','scenario')
on conflict (user_id, source, ref_id) do nothing;

-- Recompute xp_total from ledger for all users
update public.profiles p
  set xp_total = coalesce(s.total, 0)
  from (select user_id, sum(amount) as total from public.xp_ledger group by user_id) s
  where s.user_id = p.user_id;