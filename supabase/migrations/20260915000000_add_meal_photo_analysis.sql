-- Photo-based meal analysis: users photograph a plate and get an
-- AI-estimated portion/nutrition breakdown tailored to their health
-- condition (calories, carbs/glycemic load, cholesterol-relevant fats, etc).

INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "meal photos: owner select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "meal photos: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "meal photos: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE TABLE public.meal_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  foto_path text NOT NULL,
  resultado_json jsonb NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.meal_analyses TO authenticated;
GRANT ALL ON public.meal_analyses TO service_role;
ALTER TABLE public.meal_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own meal_analyses select" ON public.meal_analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own meal_analyses insert" ON public.meal_analyses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own meal_analyses delete" ON public.meal_analyses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
