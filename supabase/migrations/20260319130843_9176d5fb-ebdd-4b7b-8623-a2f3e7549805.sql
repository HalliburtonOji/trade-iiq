
-- Trading rules / playbook
CREATE TABLE public.trading_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rule_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trading_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own rules" ON public.trading_rules
  FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trading DNA profile (cached AI analysis of user patterns)
CREATE TABLE public.trading_dna (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  best_asset_class TEXT,
  worst_asset_class TEXT,
  favourite_strategy TEXT,
  most_common_mistake TEXT,
  best_confidence_range TEXT,
  worst_emotional_trigger TEXT,
  overconfidence_score NUMERIC,
  dna_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trading_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own DNA" ON public.trading_dna
  FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
