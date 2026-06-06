import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRIAL_DAYS = 7;

type SubRow = {
  status: string | null;
  trial_end: string | null;
  current_period_end: string | null;
};

export function isSubscriptionActive(sub: SubRow | null | undefined): boolean {
  if (!sub) return false;
  const now = Date.now();
  if (sub.status === "active") {
    if (!sub.current_period_end) return true;
    return new Date(sub.current_period_end).getTime() > now;
  }
  if (sub.status === "trialing") {
    return !!sub.trial_end && new Date(sub.trial_end).getTime() > now;
  }
  return false;
}

/**
 * Server-only helper. Reads the user's latest subscription using the
 * RLS-scoped client, and throws if it's not active. Use inside premium
 * server functions before doing any paid work.
 */
export async function requireActiveSubscription(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, trial_end, current_period_end")
    .eq("user_id", userId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!isSubscriptionActive(data as SubRow | null)) {
    throw new Error("Necesitas una suscripción activa para usar esta función.");
  }
}

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) return existing;

    // Authenticated users can no longer insert subscriptions directly (RLS).
    // Create the initial trial server-side using the admin client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
    const { data: created, error } = await supabaseAdmin
      .from("subscriptions")
      .insert({ user_id: userId, status: "trialing", trial_end: trialEnd })
      .select("*")
      .single();
    if (error) {
      console.error("[subscription.getMySubscription] insert error", error);
      throw new Error("No se pudo inicializar tu suscripción.");
    }
    return created;
  });
