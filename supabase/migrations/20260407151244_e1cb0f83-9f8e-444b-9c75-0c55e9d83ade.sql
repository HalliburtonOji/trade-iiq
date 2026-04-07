
-- 1. Fix storage INSERT policy: add ownership check so users can only upload to their own folder
DROP POLICY IF EXISTS "Authenticated users can upload chart screenshots" ON storage.objects;
CREATE POLICY "Authenticated users can upload own chart screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chart_screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Fix community_votes: restrict SELECT so users can only read their own votes
-- (aggregate vote counts should be computed via edge functions or RPC, not by exposing all rows)
DROP POLICY IF EXISTS "Anyone can read votes" ON public.community_votes;
CREATE POLICY "Users can view own votes"
  ON public.community_votes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
