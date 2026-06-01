import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, CreditCard, Sparkles } from "lucide-react";
import { getMySubscription } from "@/lib/subscription.functions";

export const Route = createFileRoute("/_authenticated/_app/suscripcion")({
  head: () => ({ meta: [{ title: "Suscripción — Recetario Vital" }] }),
  component: SuscripcionPage,
});

function SuscripcionPage() {
  const fetch = useServerFn(getMySubscription);
  const { data: sub } = useQuery({ queryKey: ["subscription"], queryFn: () => fetch() });

  const trialEnd = sub?.trial_end ? new Date(sub.trial_end) : null;
  const now = new Date();
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)) : 0;
  const status = sub?.status ?? "trialing";

  const statusLabel: Record<string, string> = {
    trialing: "Período de prueba",
    active: "Suscripción activa",
    past_due: "Pago pendiente",
    canceled: "Cancelada",
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-background px-5 py-4">
        <Link to="/cuenta" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-serif text-lg">Suscripción</h1>
        <span className="w-9" />
      </header>

      <main className="space-y-4 px-5 py-5 pb-24">
        <section className="overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-white/80">
            <Sparkles className="h-3.5 w-3.5" /> {statusLabel[status] ?? status}
          </div>
          {status === "trialing" ? (
            <>
              <p className="mt-2 font-serif text-3xl">{daysLeft} días restantes</p>
              <p className="mt-1 text-xs text-white/70">
                {trialEnd ? `Tu período de prueba termina el ${trialEnd.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}.` : "Sin fecha de fin registrada."}
              </p>
            </>
          ) : status === "active" ? (
            <>
              <p className="mt-2 font-serif text-3xl">Plan Mensual</p>
              <p className="mt-1 text-xs text-white/70">Renovación: {sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("es-MX") : "—"}</p>
            </>
          ) : (
            <p className="mt-2 font-serif text-2xl">Reactiva tu plan para seguir con Camila</p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl">Plan Mensual</h2>
            <p className="font-serif text-2xl text-primary">$99 <span className="text-xs font-sans text-muted-foreground">MXN/mes</span></p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Cancela cuando quieras, sin compromiso.</p>

          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              "Plan semanal personalizado con Camila",
              "Lista de compras consolidada cada semana",
              "Coach 24/7 con respuestas en segundos",
              "Historial de progreso descargable en PDF",
              "Sin anuncios, sin compartir tus datos",
            ].map(t => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <button
            disabled
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-medium text-accent-foreground disabled:opacity-70"
          >
            <CreditCard className="h-4 w-4" />
            {status === "active" ? "Administrar pago" : "Activar suscripción"}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Conectaremos tu método de pago al activar Stripe.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <p>Al suscribirte aceptas nuestros términos. Puedes cancelar en cualquier momento desde esta pantalla. Tu información de salud nunca se comparte con terceros.</p>
        </section>
      </main>
    </>
  );
}
