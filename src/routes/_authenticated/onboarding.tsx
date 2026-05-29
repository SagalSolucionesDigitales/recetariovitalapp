import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { getMyProfile, saveOnboarding } from "@/lib/profile.functions";
import { generateWeeklyPlan } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Tu perfil — Recetario Vital" }] }),
  component: OnboardingPage,
});

type Glu = "100-110" | "111-125" | "no-se";
type Tiempo = "menos15" | "15-30" | "mas30";
type Personas = "1" | "2" | "3+";
type Presup = "menos500" | "500-1000" | "mas1000";

function OnboardingPage() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const save = useServerFn(saveOnboarding);
  const genPlan = useServerFn(generateWeeklyPlan);

  const [step, setStep] = useState(1);
  const [glu, setGlu] = useState<Glu | null>(null);
  const [rest, setRest] = useState<string[]>([]);
  const [tiempo, setTiempo] = useState<Tiempo | null>(null);
  const [personas, setPersonas] = useState<Personas | null>(null);
  const [presup, setPresup] = useState<Presup | null>(null);
  const [summary, setSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    fetchProfile().then(p => {
      if (p?.nombre) setNombre(p.nombre);
      if (p?.onboarding_completo) navigate({ to: "/dashboard" });
    });
  }, [fetchProfile, navigate]);

  const total = 5;
  const canNext = step === 1 ? !!glu : step === 2 ? true : step === 3 ? !!tiempo : step === 4 ? !!personas : !!presup;

  function next() {
    if (step < total) setStep(step + 1);
    else setSummary(true);
  }

  async function finish() {
    if (!glu || !tiempo || !personas || !presup) return;
    setGenerating(true);
    try {
      await save({ data: { glucosa_referencia: glu, restricciones: rest, tiempo_cocina: tiempo, personas, presupuesto: presup } });
      await genPlan().catch(() => null); // best-effort
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Algo salió mal");
      setGenerating(false);
    }
  }

  if (summary) {
    return (
      <div className="app-shell min-h-screen bg-background">
        <main className="px-6 pb-24 pt-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 font-serif text-3xl">Tu perfil está listo</h1>
          <p className="mt-2 text-sm text-muted-foreground">Camila usará esta información para generar tu primer plan personalizado.</p>

          <div className="mt-6 space-y-2.5 rounded-2xl border border-border bg-card p-4 text-left">
            <Row label="Glucosa" value={gluLabel(glu)} />
            <Row label="Restricciones" value={rest.length ? rest.map(restLabel).join(", ") : "Ninguna"} />
            <Row label="Tiempo de cocina" value={tiempoLabel(tiempo)} />
            <Row label="Personas en casa" value={personasLabel(personas)} />
            <Row label="Presupuesto" value={presupLabel(presup)} />
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-primary-soft p-4 text-left">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-serif text-white">C</div>
            <p className="text-sm text-primary">
              {glu === "111-125"
                ? "Con glucosa en ese rango, la consistencia en el plan marca una diferencia real en pocas semanas. Empecemos."
                : glu === "100-110"
                ? "Estás en el momento ideal para actuar. Con este perfil podemos revertir la tendencia con ajustes concretos."
                : "Hola, ya conozco tu punto de partida. Tu primer plan estará listo en segundos."}
            </p>
          </div>

          <button
            onClick={finish}
            disabled={generating}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 text-base font-medium text-accent-foreground disabled:opacity-60"
          >
            {generating ? (<><Loader2 className="h-5 w-5 animate-spin" /> Generando tu plan…</>) : "Ver mi primer plan"}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen bg-background">
      <header className="bg-primary px-5 pb-4 pt-5 text-primary-foreground">
        <div className="flex items-center justify-between">
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            className={`grid h-9 w-9 place-items-center rounded-full bg-white/10 ${step === 1 ? "opacity-0 pointer-events-none" : ""}`}
            aria-label="Atrás"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-white/80">Paso {step} de {total}</span>
          <span className="w-9" />
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full bg-white transition-all duration-500" style={{ width: `${(step / total) * 100}%` }} />
        </div>
      </header>

      <main className="px-6 pb-28 pt-7">
        {step === 1 && (
          <Step
            eyebrow="TU PUNTO DE PARTIDA"
            title="¿Cuál fue tu resultado de glucosa en ayunas?"
            subtitle="Lo usaremos para personalizar tu plan. No te preocupes si no lo recuerdas exacto."
          >
            <RadioCard active={glu === "100-110"} onClick={() => setGlu("100-110")} title="Entre 100 y 110 mg/dL" sub="Prediabetes leve — con ajustes se revierte fácilmente" />
            <RadioCard active={glu === "111-125"} onClick={() => setGlu("111-125")} title="Entre 111 y 125 mg/dL" sub="Prediabetes moderada — el plan marcará una diferencia real" />
            <RadioCard active={glu === "no-se"} onClick={() => setGlu("no-se")} title="No lo sé exactamente" sub="Sin problema, igual armamos tu plan" />
          </Step>
        )}

        {step === 2 && (
          <Step
            eyebrow="LO QUE EVITAMOS"
            title="¿Qué alimentos evitas o no toleras?"
            subtitle="Puedes elegir varias opciones. Tu plan no incluirá estos ingredientes."
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "gluten", l: "🌾 Gluten" },
                { id: "lacteos", l: "🥛 Lácteos" },
                { id: "mariscos", l: "🦐 Mariscos" },
                { id: "cerdo", l: "🥩 Cerdo" },
                { id: "picante", l: "🌶️ Picante" },
                { id: "ninguno", l: "✅ Ninguno por ahora" },
              ].map(({ id, l }) => {
                const sel = rest.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === "ninguno") setRest(sel ? [] : ["ninguno"]);
                      else setRest(prev => {
                        const cleaned = prev.filter(x => x !== "ninguno");
                        return sel ? cleaned.filter(x => x !== id) : [...cleaned, id];
                      });
                    }}
                    className={`relative rounded-xl border p-4 text-left text-sm transition-all ${sel ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
                  >
                    <span className="block font-medium">{l}</span>
                    <span className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border ${sel ? "border-primary bg-primary text-white" : "border-border bg-card"}`}>
                      {sel && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step eyebrow="TU RITMO DE VIDA" title="¿Cuánto tiempo tienes para cocinar por comida?" subtitle="Diseñaremos recetas que se ajusten a tu disponibilidad real.">
            <RadioCard active={tiempo === "menos15"} onClick={() => setTiempo("menos15")} title="Menos de 15 minutos" sub="Recetas rápidas, ingredientes simples" />
            <RadioCard active={tiempo === "15-30"} onClick={() => setTiempo("15-30")} title="Entre 15 y 30 minutos" sub="El rango ideal para variedad y nutrición" />
            <RadioCard active={tiempo === "mas30"} onClick={() => setTiempo("mas30")} title="Más de 30 minutos" sub="Recetas más elaboradas y con mayor variedad" />
          </Step>
        )}

        {step === 4 && (
          <Step eyebrow="TU ENTORNO" title="¿Para cuántas personas cocinas?" subtitle="Ajustaremos las porciones y la lista de compras a tu realidad.">
            <RadioCard active={personas === "1"} onClick={() => setPersonas("1")} title="Solo para mí" sub="Porciones individuales, menos desperdicio" />
            <RadioCard active={personas === "2"} onClick={() => setPersonas("2")} title="Para 2 personas" sub="Porciones dobles, compras eficientes" />
            <RadioCard active={personas === "3+"} onClick={() => setPersonas("3+")} title="Para 3 o más" sub="Porciones familiares, recetas rindidoras" />
          </Step>
        )}

        {step === 5 && (
          <Step eyebrow="TU PRESUPUESTO" title="¿Cuánto destinas a la compra semanal de alimentos?" subtitle="Priorizaremos ingredientes accesibles y nutritivos dentro de tu rango.">
            <RadioCard active={presup === "menos500"} onClick={() => setPresup("menos500")} title="Menos de $500 MXN" sub="Recetas económicas con ingredientes de mercado local" />
            <RadioCard active={presup === "500-1000"} onClick={() => setPresup("500-1000")} title="Entre $500 y $1,000 MXN" sub="Buen balance entre variedad y costo" />
            <RadioCard active={presup === "mas1000"} onClick={() => setPresup("mas1000")} title="Más de $1,000 MXN" sub="Mayor variedad y opciones especializadas" />
          </Step>
        )}
      </main>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background p-4">
        <button
          onClick={next}
          disabled={!canNext}
          className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          Continuar
        </button>
        {nombre ? null : null}
      </div>
    </div>
  );
}

function Step({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-right-3 duration-300">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-2xl leading-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6 space-y-3">{children}</div>
    </div>
  );
}

function RadioCard({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${active ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
    >
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border bg-card"}`}>
        {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function gluLabel(g: Glu | null) {
  return g === "100-110" ? "100–110 mg/dL" : g === "111-125" ? "111–125 mg/dL" : "Sin dato exacto";
}
function restLabel(r: string) {
  return ({ gluten: "Gluten", lacteos: "Lácteos", mariscos: "Mariscos", cerdo: "Cerdo", picante: "Picante", ninguno: "Ninguno" } as Record<string, string>)[r] ?? r;
}
function tiempoLabel(t: Tiempo | null) {
  return t === "menos15" ? "< 15 min" : t === "15-30" ? "15–30 min" : t === "mas30" ? "> 30 min" : "";
}
function personasLabel(p: Personas | null) {
  return p === "1" ? "1 persona" : p === "2" ? "2 personas" : p === "3+" ? "3 o más" : "";
}
function presupLabel(p: Presup | null) {
  return p === "menos500" ? "< $500 MXN" : p === "500-1000" ? "$500–$1,000 MXN" : p === "mas1000" ? "> $1,000 MXN" : "";
}
