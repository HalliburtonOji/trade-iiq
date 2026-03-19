
-- Create chart_analyses table
CREATE TABLE public.chart_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  symbol text,
  analysis_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chart_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chart analyses" ON public.chart_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chart analyses" ON public.chart_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chart analyses" ON public.chart_analyses FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for chart screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('chart_screenshots', 'chart_screenshots', true);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload chart screenshots" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chart_screenshots');
CREATE POLICY "Anyone can view chart screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'chart_screenshots');
CREATE POLICY "Users can delete own chart screenshots" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chart_screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
