import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      await supabase.auth.signOut().catch(() => {});
      throw redirect({ to: "/login" });
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      await supabase.auth.signOut().catch(() => {});
      throw redirect({ to: "/login" });
    }
  },
  component: () => <Outlet />,
});
