import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
import { getMyProfile } from "@/lib/profile.functions";
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

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
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
