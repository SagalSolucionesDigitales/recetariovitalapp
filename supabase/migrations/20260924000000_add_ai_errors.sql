-- One row per failed Gemini call (each attempt), so we can tell afterwards what
-- broke and when: Vercel runtime logs on the Hobby plan only keep the last hour.
-- Server-only, same as cron_runs: no policies and no grants for
-- authenticated/anon, so clients can neither read nor write it.
CREATE TABLE public.ai_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  label text NOT NULL,
  model text NOT NULL,
  attempt integer NOT NULL,
  status integer,
  message text,
  gave_up boolean NOT NULL DEFAULT false
);

CREATE INDEX ai_errors_created_at_idx ON public.ai_errors (created_at DESC);

GRANT ALL ON public.ai_errors TO service_role;
ALTER TABLE public.ai_errors ENABLE ROW LEVEL SECURITY;
