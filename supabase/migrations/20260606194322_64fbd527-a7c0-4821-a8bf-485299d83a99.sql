-- Remove direct write access from authenticated users on subscriptions.
-- All writes must go through server-side admin (Stripe webhook / server fn with service role).
DROP POLICY IF EXISTS "own sub insert" ON public.subscriptions;
DROP POLICY IF EXISTS "own sub update" ON public.subscriptions;
DROP POLICY IF EXISTS "own sub delete" ON public.subscriptions;

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
-- Keep SELECT so users can read their own subscription via existing "own sub select" policy.
