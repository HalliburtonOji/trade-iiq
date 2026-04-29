-- 1a. Remove the legacy duplicate slug and its progress
delete from public.learn_progress
  where module_id in (select id from public.learn_modules where slug = 'mind-01-bias-basics');
delete from public.learn_modules where slug = 'mind-01-bias-basics';

-- 2. Lower default pass score for newly generated quizzes
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='learn_modules' and column_name='pass_score') then
    execute 'alter table public.learn_modules alter column pass_score set default 60';
  end if;
end $$;

-- 4c. Council reviews cache (one per user per week)
create table if not exists public.council_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  week_starting date not null,
  ai_summary text not null default '',
  decree text not null default '',
  aggregates jsonb not null default '{}'::jsonb,
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_starting)
);

alter table public.council_reviews enable row level security;

create policy "Users can view own council reviews"
  on public.council_reviews for select
  using (auth.uid() = user_id);

create policy "Users can insert own council reviews"
  on public.council_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own council reviews"
  on public.council_reviews for update
  using (auth.uid() = user_id);

create trigger council_reviews_updated_at
  before update on public.council_reviews
  for each row execute function public.update_updated_at_column();

create index if not exists idx_council_reviews_user_week
  on public.council_reviews (user_id, week_starting desc);