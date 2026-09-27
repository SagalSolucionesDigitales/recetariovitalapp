-- Which device each push subscription belongs to (browser user agent) and when
-- the app last re-saved it. Without these we couldn't tell the user's phone
-- from their PC when FCM accepted every push but only one device showed it.
-- The app re-saves the current subscription on every open, so a stale
-- actualizado_en points at a subscription no device is using anymore.
ALTER TABLE public.push_subscriptions
  ADD COLUMN dispositivo text,
  ADD COLUMN actualizado_en timestamptz NOT NULL DEFAULT now();
