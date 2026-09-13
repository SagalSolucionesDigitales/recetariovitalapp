-- Admin bypass: specific emails get access without a Hotmart purchase,
-- so the app owner can log in and use the app for monitoring/QA.

CREATE TABLE public.app_admins (
  email text PRIMARY KEY,
  creado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.app_admins TO service_role;

INSERT INTO public.app_admins (email) VALUES ('marketingdentalsagal@gmail.com');

CREATE OR REPLACE FUNCTION public.check_hotmart_access(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hotmart_purchases
    WHERE email = lower(trim(p_email))
      AND status = 'approved'
  ) OR EXISTS (
    SELECT 1 FROM public.app_admins
    WHERE email = lower(trim(p_email))
  );
$$;
