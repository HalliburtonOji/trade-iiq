-- Allow public read access to Sophos's mentor data for the public profile page.
-- These tables contain only the AI mentor's own activity (no user PII).

DROP POLICY IF EXISTS "auth read mentor profile" ON public.mentor_profile;
CREATE POLICY "public read mentor profile" ON public.mentor_profile
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "auth read mentor trades" ON public.mentor_trades;
CREATE POLICY "public read mentor trades" ON public.mentor_trades
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "auth read mentor intents" ON public.mentor_intents;
CREATE POLICY "public read mentor intents" ON public.mentor_intents
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "auth read mentor journal" ON public.mentor_journal;
CREATE POLICY "public read mentor journal" ON public.mentor_journal
  FOR SELECT TO public USING (true);