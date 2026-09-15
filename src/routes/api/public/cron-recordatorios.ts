import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron-recordatorios")({
  server: {
    handlers: {
      // Vercel Cron sends GET with an `Authorization: Bearer $CRON_SECRET`
      // header (when CRON_SECRET is set in the project's env vars).
      GET: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization");
        if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const vapidPublic = process.env.VAPID_PUBLIC_KEY?.trim();
        const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
        const vapidSubject = (process.env.VAPID_SUBJECT || "mailto:hola@recetariovital.app").trim();
        if (!vapidPublic || !vapidPrivate) {
          console.error("[cron-recordatorios] Missing VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY");
          return new Response("Missing VAPID config", { status: 500 });
        }

        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        const semanaInicio = monday.toISOString().slice(0, 10);

        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("onboarding_completo", true);
        const userIds = (profiles ?? []).map((p) => p.id);
        if (!userIds.length) {
          return new Response(JSON.stringify({ sent: 0 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const [{ data: checkins }, { data: plans }, { data: subs }] = await Promise.all([
          supabaseAdmin
            .from("check_ins")
            .select("user_id")
            .eq("fecha", today)
            .in("user_id", userIds),
          supabaseAdmin
            .from("weekly_plans")
            .select("user_id")
            .eq("semana_inicio", semanaInicio)
            .in("user_id", userIds),
          supabaseAdmin.from("push_subscriptions").select("*").in("user_id", userIds),
        ]);

        const hasCheckinToday = new Set((checkins ?? []).map((c) => c.user_id));
        const hasPlanThisWeek = new Set((plans ?? []).map((p) => p.user_id));

        const subsByUser = new Map<string, NonNullable<typeof subs>>();
        for (const s of subs ?? []) {
          const arr = subsByUser.get(s.user_id) ?? [];
          arr.push(s);
          subsByUser.set(s.user_id, arr);
        }

        let sent = 0;
        const staleEndpoints: string[] = [];

        for (const userId of userIds) {
          const userSubs = subsByUser.get(userId);
          if (!userSubs?.length) continue;

          let body: string;
          if (!hasPlanThisWeek.has(userId)) {
            body = "Aún no generas tu plan de esta semana. ¡Pídeselo a Camila!";
          } else if (!hasCheckinToday.has(userId)) {
            body = "No has registrado cómo te sientes hoy. Tarda menos de 1 minuto.";
          } else {
            continue;
          }

          const payload = JSON.stringify({ title: "Recetario Vital", body, url: "/dashboard" });

          for (const sub of userSubs) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
              );
              sent++;
            } catch (err) {
              const statusCode = (err as { statusCode?: number })?.statusCode;
              if (statusCode === 404 || statusCode === 410) {
                staleEndpoints.push(sub.endpoint);
              } else {
                console.error("[cron-recordatorios] push error", err);
              }
            }
          }
        }

        if (staleEndpoints.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
        }

        const debug = new URL(request.url).searchParams.get("debug") === "1";
        return new Response(
          JSON.stringify(
            debug
              ? {
                  sent,
                  today,
                  semanaInicio,
                  userIds,
                  hasCheckinToday: [...hasCheckinToday],
                  hasPlanThisWeek: [...hasPlanThisWeek],
                  subsByUser: [...subsByUser.entries()].map(([uid, arr]) => [uid, arr.length]),
                }
              : { sent },
          ),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
