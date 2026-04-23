-- 1) learn_modules: the curriculum
create table if not exists public.learn_modules (
  id uuid primary key default gen_random_uuid(),
  track text not null check (track in ('markets','chart','risk','mind','craft')),
  level int not null check (level between 1 and 3),
  slug text not null unique,
  title_en text not null,
  title_gr text not null,
  summary text,
  prereqs uuid[] default '{}',
  ordinal int not null default 0,
  content_md text,
  drill_json jsonb,
  scenario_json jsonb,
  quiz_json jsonb,
  learn_minutes int default 8,
  xp_reward int default 50,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_learn_modules_tl on public.learn_modules (track, level, ordinal);

-- 2) learn_progress: per-user, per-module, per-mode
create table if not exists public.learn_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.learn_modules(id) on delete cascade,
  mode text not null check (mode in ('lesson','drill','scenario','quiz')),
  status text not null default 'in_progress' check (status in ('in_progress','completed','failed')),
  score numeric,
  playbook_rule_created boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, module_id, mode)
);
create index if not exists idx_learn_progress_um on public.learn_progress (user_id, module_id);

-- 3) learn_recommendations: daily AI-picked next module per user
create table if not exists public.learn_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.learn_modules(id) on delete cascade,
  reason text not null,
  reason_detail jsonb,
  generated_at timestamptz default now(),
  dismissed_at timestamptz
);
create index if not exists idx_learn_rec_ug on public.learn_recommendations (user_id, generated_at desc);

-- RLS
alter table public.learn_modules enable row level security;
alter table public.learn_progress enable row level security;
alter table public.learn_recommendations enable row level security;

-- Public read on published modules (landing in the app is authed so this is fine)
create policy "read published modules"
  on public.learn_modules for select
  using (is_published = true);

-- Users own their progress + recommendations
create policy "user manages own progress"
  on public.learn_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user reads own recommendations"
  on public.learn_recommendations for select
  using (auth.uid() = user_id);
create policy "user updates own recommendations"
  on public.learn_recommendations for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Updated_at trigger on learn_modules
create or replace function public.tg_learn_modules_updated()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists learn_modules_updated on public.learn_modules;
create trigger learn_modules_updated
  before update on public.learn_modules
  for each row execute function public.tg_learn_modules_updated();