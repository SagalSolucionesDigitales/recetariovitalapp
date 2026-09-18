-- One row per reminder-cron run, so we can tell afterwards whether it fired and
-- what the push service answered (Vercel runtime logs on the Hobby plan only
-- keep the last hour). Server-only: no policies and no grants for
-- authenticated/anon, so clients can neither read nor write it.
CREATE TABLE public.cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job text NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  users integer NOT NULL DEFAULT 0,
  pending integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  stale integer NOT NULL DEFAULT 0,
  failed jsonb NOT NULL DEFAULT '[]'::jsonb
);

GRANT ALL ON public.cron_runs TO service_role;
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;
