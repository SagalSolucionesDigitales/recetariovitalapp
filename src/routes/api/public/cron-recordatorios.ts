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

        const run = {
          users: userIds.length,
          pending: 0,
          sent: 0,
          stale: 0,
          failed: [] as { status: number | null; message: string }[],
        };
        // Best-effort: a logging failure must never break the reminders.
        const recordRun = async () => {
          try {
            const { error } = await supabaseAdmin
              .from("cron_runs")
              .insert({ job: "recordatorios", ...run });
            if (error) console.error("[cron-recordatorios] could not record run", error);
          } catch (err) {
            console.error("[cron-recordatorios] could not record run", err);
          }
        };

        if (!userIds.length) {
          await recordRun();
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

          run.pending++;
          const payload = JSON.stringify({ title: "Recetario Vital", body, url: "/dashboard" });

          for (const sub of userSubs) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
                // Sin urgencia alta, Android en Doze puede retener el aviso
                // (FCM lo "acepta" pero no lo entrega al instante).
                { TTL: 60 * 60 * 12, urgency: "high" },
              );
              run.sent++;
            } catch (err) {
              const statusCode = (err as { statusCode?: number })?.statusCode;
              if (statusCode === 404 || statusCode === 410) {
                staleEndpoints.push(sub.endpoint);
              } else {
                console.error("[cron-recordatorios] push error", err);
                run.failed.push({
                  status: statusCode ?? null,
                  message: (err instanceof Error ? err.message : String(err)).slice(0, 200),
                });
              }
            }
          }
        }

        if (staleEndpoints.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
        }
        run.stale = staleEndpoints.length;
        await recordRun();

        return new Response(JSON.stringify({ sent: run.sent }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
