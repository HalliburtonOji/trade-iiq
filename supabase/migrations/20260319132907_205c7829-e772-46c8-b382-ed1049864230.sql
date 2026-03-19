
-- Add trading_personality column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_personality text NOT NULL DEFAULT 'balanced';

-- Add columns for paper trading upgrades
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paper_balance numeric NOT NULL DEFAULT 10000;
