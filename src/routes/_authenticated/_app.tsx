import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
import { getMyProfile } from "@/lib/profile.functions";
import { savePushSubscription } from "@/lib/push.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw redirect({ to: "/login" });
    try {
      const p = await getMyProfile();
      if (!p?.onboarding_completo) throw redirect({ to: "/onboarding" });
    } catch (e) {
      // If unauthorized or other, let parent guard handle it
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: AppLayout,
});

// The browser can rotate or lose its push endpoint, and the cron deletes
// endpoints FCM reports as gone. Re-saving the current subscription on open
// keeps the server in step, so a reminder toggle that looks on isn't silently
// dead. Only touches users who already enabled reminders.
function PushSubscriptionSync() {
  const saveSub = useServerFn(savePushSubscription);
  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (Notification.permission !== "granted") return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const json = (await reg.pushManager.getSubscription())?.toJSON();
        if (!json?.endpoint || !json.keys?.p256dh || !json.keys.auth) return;
        await saveSub({
          data: {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          },
        });
      } catch {
        /* best-effort: never block the app over reminders */
      }
    })();
  }, [saveSub]);
  return null;
}

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <PushSubscriptionSync />
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <div className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
