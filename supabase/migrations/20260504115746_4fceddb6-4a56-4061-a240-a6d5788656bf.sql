-- Add mirror-mode preferences to mentor_followers
ALTER TABLE public.mentor_followers
  ADD COLUMN IF NOT EXISTS mirror_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mirror_risk_pct numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS mirror_started_at timestamptz,
  ADD CONSTRAINT mentor_followers_user_unique UNIQUE (user_id);

-- Validation: risk between 0.1% and 2%
CREATE OR REPLACE FUNCTION public.mentor_followers_validate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.mirror_risk_pct < 0.1 OR NEW.mirror_risk_pct > 2 THEN
    RAISE EXCEPTION 'mirror_risk_pct must be between 0.1 and 2';
  END IF;
  IF NEW.mirror_enabled = true AND (OLD IS NULL OR OLD.mirror_enabled = false) THEN
    NEW.mirror_started_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mentor_followers_validate ON public.mentor_followers;
CREATE TRIGGER trg_mentor_followers_validate
  BEFORE INSERT OR UPDATE ON public.mentor_followers
  FOR EACH ROW EXECUTE FUNCTION public.mentor_followers_validate();

-- Helpful index for fanout
CREATE INDEX IF NOT EXISTS idx_mentor_followers_mirror ON public.mentor_followers (mirror_enabled) WHERE mirror_enabled = true;