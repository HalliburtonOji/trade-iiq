create table if not exists public.rule_violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_id uuid references public.playbooks(id) on delete set null,
  trade_id uuid,
  reason text,
  dismissed boolean default false,
  created_at timestamptz default now()
);

alter table public.rule_violations enable row level security;

create policy "user manages own violations" on public.rule_violations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_rule_violations_user on public.rule_violations (user_id, created_at desc);