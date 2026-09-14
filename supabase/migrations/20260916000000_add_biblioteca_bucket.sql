-- Biblioteca / Bonos exclusivos: static bonus PDFs (same files for every
-- approved user), gated by the existing Hotmart access check rather than
-- per-user folders like meal-photos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('biblioteca', 'biblioteca', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "biblioteca: hotmart approved read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'biblioteca' AND public.has_hotmart_access());
