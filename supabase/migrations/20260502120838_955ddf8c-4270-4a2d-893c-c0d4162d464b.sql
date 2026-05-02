ALTER TABLE public.xp_ledger DROP CONSTRAINT IF EXISTS xp_ledger_source_check;
ALTER TABLE public.xp_ledger ADD CONSTRAINT xp_ledger_source_check
  CHECK (source = ANY (ARRAY['lesson'::text, 'drill'::text, 'quiz'::text, 'scenario'::text, 'paper_trade'::text, 'daily_mission'::text, 'trading_mission'::text, 'initiation'::text]));