-- Swap embedding dim from 1536 (OpenAI) to 11 (our feature vector)
drop index if exists scenario_memory_emb_idx;
alter table public.trading_signatures drop column if exists embedding;
alter table public.trading_signatures add column embedding vector(11);
alter table public.scenario_memory drop column if exists embedding;
alter table public.scenario_memory add column embedding vector(11);
create index if not exists scenario_memory_emb_idx on public.scenario_memory
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Historical candles cache (unlimited lifetime; daily candles never change)
create table if not exists public.candle_cache (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  start_date date not null,
  end_date date not null,
  candles jsonb not null,
  cached_at timestamptz default now(),
  unique(symbol, start_date, end_date)
);

-- Live quote cache (60s TTL enforced in code)
create table if not exists public.quote_cache (
  symbol text primary key,
  price numeric,
  change_pct numeric,
  payload jsonb not null,
  cached_at timestamptz default now()
);

alter table public.candle_cache enable row level security;
alter table public.quote_cache enable row level security;
create policy "auth read candles" on public.candle_cache for select using (auth.role() = 'authenticated');
create policy "auth read quotes" on public.quote_cache for select using (auth.role() = 'authenticated');