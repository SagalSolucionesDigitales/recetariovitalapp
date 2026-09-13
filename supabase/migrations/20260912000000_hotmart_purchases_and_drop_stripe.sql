-- Switch access model from Stripe subscriptions (7-day trial + monthly) to a
-- single Hotmart one-time purchase gate: a user only has access if their
-- account email matches an approved Hotmart purchase.

CREATE TABLE public.hotmart_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL,
  hotmart_transaction text NOT NULL UNIQUE,
  product_id text,
  purchased_at timestamptz,
  payload jsonb,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hotmart_purchases_email_idx ON public.hotmart_purchases (email);

-- Only the webhook (service_role, bypasses RLS) writes/reads this table
-- directly. Everyone else goes through the SECURITY DEFINER functions below,
-- which only ever reveal a boolean.
ALTER TABLE public.hotmart_purchases ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.hotmart_purchases TO service_role;

-- Pre-signup eligibility check (anon: no session yet). Reveals only whether
-- the given email has an approved purchase, nothing else.
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
  );
$$;
GRANT EXECUTE ON FUNCTION public.check_hotmart_access(text) TO anon, authenticated;

-- Post-login gate: checks the caller's own JWT email.
CREATE OR REPLACE FUNCTION public.has_hotmart_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT public.check_hotmart_access(coalesce(auth.jwt() ->> 'email', ''));
$$;
GRANT EXECUTE ON FUNCTION public.has_hotmart_access() TO authenticated;

-- Stripe subscription model is retired (no real paying users existed on it).
DROP TABLE public.subscriptions;
