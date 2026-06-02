import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarRange, MessageCircle, LineChart, Sparkles, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Recetario Vital — Recetas para prediabetes" },
      { name: "description", content: "Come delicioso y cuida tu glucosa. Plan semanal personalizado, coach 24/7 y registro de progreso. 7 días gratis." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) throw redirect({ to: "/dashboard" });
  },
  component: Splash,
});

function Splash() {
  return (
    <div className="app-shell flex min-h-screen flex-col">
      {/* Top — verde */}
      <section className="relative overflow-hidden bg-primary px-6 pb-10 pt-12 text-white">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/[0.04]" />
        <div className="pointer-events-none absolute right-[-30px] top-24 h-32 w-32 rounded-full bg-white/[0.03]" />
        <div className="pointer-events-none absolute -bottom-16 left-16 h-44 w-44 rounded-full bg-white/[0.04]" />

        <h1 className="font-serif text-2xl text-white/55">
          Recetario <em className="not-italic font-serif italic">Vital</em>
        </h1>

        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
          <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.16_150)]" />
          Para personas con prediabetes
        </span>

        <h2 className="mt-5 font-serif text-[30px] leading-[1.15]">
          Come delicioso y{" "}
          <em className="font-serif italic text-white/60">cuida tu glucosa</em>{" "}
          sin sacrificar nada.
        </h2>

        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Recetas diseñadas <strong className="font-medium text-white/90">exactamente para tu condición</strong>, adaptadas a tus ingredientes y presupuesto. Disfruta el placer de comer mientras cuidas tu salud.
        </p>

        <ul className="mt-7 space-y-3">
          {[
            { Icon: CalendarRange, t: "Plan semanal personalizado generado con tu perfil real" },
            { Icon: MessageCircle, t: "Coach disponible 24/7 que responde tus dudas con contexto" },
            { Icon: LineChart, t: "Registro de tu progreso para llevar a tu próxima consulta" },
          ].map(({ Icon, t }) => (
            <li key={t} className="flex items-start gap-3">
              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-white/10">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="text-sm text-white/85">{t}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex items-center gap-3">
          <div className="flex -space-x-2">
            {["MA", "JL", "RS", "VP"].map((i, idx) => (
              <span
                key={i}
                className="grid h-8 w-8 place-items-center rounded-full border-2 border-primary bg-white text-[11px] font-medium text-primary"
                style={{ zIndex: 10 - idx }}
              >{i}</span>
            ))}
          </div>
          <p className="text-xs leading-snug text-white/70">
            <strong className="font-medium text-white/95">+2,400 personas</strong> ya controlan su prediabetes con Recetario Vital
          </p>
        </div>
      </section>

      {/* Bottom — crema */}
      <section className="-mt-4 flex-1 rounded-t-[26px] bg-background px-6 pb-10 pt-7">
        <Link
          to="/signup"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 text-base font-medium text-accent-foreground shadow-sm transition-opacity hover:opacity-95"
        >
          <Sparkles className="h-5 w-5" />
          Empieza gratis — 7 días sin costo
        </Link>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <CreditCard className="h-3.5 w-3.5" />
          Sin tarjeta de crédito para iniciar
        </p>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </section>
    </div>
  );
}
