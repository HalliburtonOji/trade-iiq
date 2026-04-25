-- Reset stale empty cache entries
DELETE FROM public.candle_cache WHERE jsonb_array_length(candles) = 0;

-- Add source column for diagnostics
ALTER TABLE public.candle_cache ADD COLUMN IF NOT EXISTS source TEXT;

-- Add diagrams column to learn_modules
ALTER TABLE public.learn_modules ADD COLUMN IF NOT EXISTS diagrams JSONB DEFAULT '[]'::jsonb;