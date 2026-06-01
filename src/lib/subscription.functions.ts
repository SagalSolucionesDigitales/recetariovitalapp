import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRIAL_DAYS = 7;

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

    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
    const { data: created, error } = await supabase
      .from("subscriptions")
      .insert({ user_id: userId, status: "trialing", trial_end: trialEnd })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return created;
  });
