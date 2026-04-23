create extension if not exists vector;

create table if not exists public.trading_signatures (
  user_id uuid primary key references auth.users(id) on delete cascade,
  signature jsonb not null,
  embedding vector(1536),
  computed_at timestamptz default now()
);
alter table public.trading_signatures enable row level security;
create policy "user reads own signature" on public.trading_signatures
  for select using (auth.uid() = user_id);

create table if not exists public.scenario_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid references public.learn_modules(id) on delete cascade,
  trade_id uuid,
  feature_json jsonb,
  embedding vector(1536),
  created_at timestamptz default now()
);
alter table public.scenario_memory enable row level security;
create policy "user reads own scenarios" on public.scenario_memory
  for select using (auth.uid() = user_id);
create index if not exists scenario_memory_emb_idx on public.scenario_memory
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);