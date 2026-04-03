
ALTER TABLE public.paper_trades 
  ADD COLUMN IF NOT EXISTS thesis_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'market',
  ADD COLUMN IF NOT EXISTS emotion text,
  ADD COLUMN IF NOT EXISTS post_notes text,
  ADD COLUMN IF NOT EXISTS leverage numeric NOT NULL DEFAULT 1;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS trading_level integer NOT NULL DEFAULT 1;
