import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShieldAlert, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sin-acceso")({
  head: () => ({ meta: [{ title: "Sin acceso — Recetario Vital" }] }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: SinAccesoPage,
});

function SinAccesoPage() {
  async function logout() {
    await supabase.auth.signOut().catch(() => {});
    window.location.assign("/login");
  }

  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center bg-primary px-6 text-center text-white">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15">
        <ShieldAlert className="h-8 w-8" strokeWidth={2} />
      </div>
      <h1 className="mt-6 font-serif text-[28px] leading-tight">No encontramos tu compra</h1>
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/85">
        No encontramos una compra aprobada en Hotmart asociada a este correo. Verifica que hayas
        iniciado sesión con el mismo correo que usaste al comprar en Hotmart.
      </p>
      <p className="mt-4 max-w-xs text-xs text-white/65">
        Si crees que esto es un error, escríbenos a{" "}
        <a href="mailto:hola@recetariovital.app" className="underline">
          hola@recetariovital.app
        </a>
        .
      </p>
      <button
        onClick={logout}
        className="mt-8 flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 text-base font-medium text-accent-foreground"
      >
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </button>
    </div>
  );
}
