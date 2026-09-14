ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS condicion_salud TEXT,
  ADD COLUMN IF NOT EXISTS colesterol_nivel TEXT,
  ADD COLUMN IF NOT EXISTS circunferencia_cintura TEXT,
  ADD COLUMN IF NOT EXISTS peso_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS estatura_cm NUMERIC;

CREATE TABLE IF NOT EXISTS public.hotmart_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL,
  hotmart_transaction TEXT NOT NULL UNIQUE,
  product_id TEXT,
  purchased_at TIMESTAMPTZ,
  payload JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hotmart_purchases_email_idx ON public.hotmart_purchases (lower(email));

GRANT ALL ON public.hotmart_purchases TO service_role;

ALTER TABLE public.hotmart_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own purchases" ON public.hotmart_purchases;
CREATE POLICY "Users can view their own purchases"
  ON public.hotmart_purchases FOR SELECT TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE OR REPLACE FUNCTION public.check_hotmart_access(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hotmart_purchases
    WHERE lower(email) = lower(coalesce(p_email, ''))
      AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_hotmart_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.check_hotmart_access(auth.jwt() ->> 'email');
$$;

GRANT EXECUTE ON FUNCTION public.check_hotmart_access(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_hotmart_access() TO authenticated, service_role;