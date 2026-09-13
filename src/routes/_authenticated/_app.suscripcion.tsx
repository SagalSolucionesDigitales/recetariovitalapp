import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_app/suscripcion")({
  head: () => ({ meta: [{ title: "Mi compra — Recetario Vital" }] }),
  component: CompraPage,
});

function CompraPage() {
  const { data: hasAccess } = useQuery({
    queryKey: ["hotmart-access"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_hotmart_access");
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-background px-5 py-4">
        <Link
          to="/cuenta"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-serif text-lg">Mi compra</h1>
        <span className="w-9" />
      </header>

      <main className="space-y-4 px-5 py-5 pb-24">
        <section className="overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-white/80">
            <Sparkles className="h-3.5 w-3.5" />{" "}
            {hasAccess ? "Compra verificada" : "Verificando compra"}
          </div>
          <p className="mt-2 font-serif text-3xl">
            {hasAccess ? "Acceso de por vida" : "Sin compra activa"}
          </p>
          <p className="mt-1 text-xs text-white/70">
            {hasAccess
              ? "Tu compra en Hotmart está aprobada. Ya no hay pagos recurrentes."
              : "No encontramos una compra aprobada asociada a tu correo."}
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl">Pago único</h2>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Un solo pago en Hotmart. Sin renovaciones ni cargos mensuales.
          </p>

          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              "Plan semanal personalizado con Camila",
              "Lista de compras consolidada cada semana",
              "Coach 24/7 con respuestas en segundos",
              "Historial de progreso descargable en PDF",
              "Sin anuncios, sin compartir tus datos",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <p>
            ¿Problemas con tu acceso o tu compra? Escríbenos a{" "}
            <a
              href="mailto:hola@recetariovital.app"
              className="font-medium text-primary hover:underline"
            >
              hola@recetariovital.app
            </a>
            . Tu información de salud nunca se comparte con terceros.
          </p>
        </section>
      </main>
    </>
  );
}
