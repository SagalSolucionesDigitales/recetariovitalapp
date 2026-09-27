import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Public — safe to expose in the client bundle. Set VITE_VAPID_PUBLIC_KEY in
// Vercel to the same value as the server-only VAPID_PUBLIC_KEY.
export const VAPID_PUBLIC_KEY = (
  import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
)?.trim();

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  // navigator.userAgent, only to tell the user's devices apart when
  // diagnosing reminders that reach one device but not another.
  dispositivo: z.string().max(500).optional(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SubscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        dispositivo: data.dispositivo ?? null,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ endpoint: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Sends a push only to the device that asked for it, with the same options as
// the daily reminder, so a missing reminder can be tested in seconds instead
// of waiting for the next cron run.
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ endpoint: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)
      .eq("endpoint", data.endpoint)
      .maybeSingle();
    if (!sub) return { ok: false as const, reason: "no-guardada" as const };

    const { getWebPush, PUSH_OPTIONS } = await import("@/lib/webpush.server");
    const webpush = await getWebPush();
    if (!webpush) throw new Error("Las notificaciones no están configuradas en el servidor.");

    const payload = JSON.stringify({
      title: "Recetario Vital",
      body: "Notificación de prueba: si ves esto, los recordatorios llegan a este dispositivo.",
      url: "/ajustes",
    });
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        PUSH_OPTIONS,
      );
      return { ok: true as const };
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        return { ok: false as const, reason: "vencida" as const };
      }
      console.error("[push.sendTestPush] push error", err);
      throw new Error(`El servicio de notificaciones respondió ${statusCode ?? "con un error"}.`);
    }
  });
