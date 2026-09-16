import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { getMyProfile, saveOnboarding } from "@/lib/profile.functions";
import { generateWeeklyPlan } from "@/lib/ai.functions";
import { RestriccionesOtrasInput } from "@/components/RestriccionesOtrasInput";
import {
  type CondicionSalud,
  type Pais,
  CONDICIONES,
  condicionLabel,
  PAISES,
  paisLabel,
  GLUCOSA_OPCIONES,
  COLESTEROL_OPCIONES,
  CINTURA_OPCIONES,
  RESTRICCIONES_OPCIONES,
  RESTRICCION_OTRA_ID,
  TIEMPO_OPCIONES,
  PERSONAS_OPCIONES,
  presupuestoOpciones,
  calcularIMC,
  categorizarIMC,
  IMC_LABELS,
} from "@/lib/condiciones";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Tu perfil — Recetario Vital" }] }),
  component: OnboardingPage,
});

type Glu = "100-110" | "111-125" | "no-se";
type Colesterol = "menos200" | "200-239" | "mas240" | "no-se";
type Cintura = "menos80" | "80-99" | "mas100" | "no-se";
type Tiempo = "menos15" | "15-30" | "mas30";
type Personas = "1" | "2" | "3+";
type Presup = "menos500" | "500-1000" | "mas1000";

function OnboardingPage() {
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getMyProfile);
  const save = useServerFn(saveOnboarding);
  const genPlan = useServerFn(generateWeeklyPlan);

  const [step, setStep] = useState(1);
  const [pais, setPais] = useState<Pais | null>(null);
  const [condicion, setCondicion] = useState<CondicionSalud | null>(null);
  const [glu, setGlu] = useState<Glu | null>(null);
  const [colesterol, setColesterol] = useState<Colesterol | null>(null);
  const [cintura, setCintura] = useState<Cintura | null>(null);
  const [pesoKg, setPesoKg] = useState<number | null>(null);
  const [estaturaCm, setEstaturaCm] = useState<number | null>(null);
  const [rest, setRest] = useState<string[]>([]);
  const [otraSel, setOtraSel] = useState(false);
  const [otrasTextos, setOtrasTextos] = useState<string[]>([]);
  const [tiempo, setTiempo] = useState<Tiempo | null>(null);
  const [personas, setPersonas] = useState<Personas | null>(null);
  const [presup, setPresup] = useState<Presup | null>(null);
  const [summary, setSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    fetchProfile().then((p) => {
      if (p?.nombre) setNombre(p.nombre);
      if (p?.onboarding_completo) navigate({ to: "/dashboard" });
    });
  }, [fetchProfile, navigate]);

  const restFinal = otraSel && otrasTextos.length ? [...rest, ...otrasTextos] : rest;

  const total = 7;
  const indicadorValido =
    condicion === "prediabetes"
      ? !!glu
      : condicion === "cardiovascular"
        ? !!colesterol
        : condicion === "sindrome_metabolico"
          ? !!cintura
          : condicion === "control_peso"
            ? !!(pesoKg && estaturaCm)
            : false;
  const canNext =
    step === 1
      ? !!pais
      : step === 2
        ? !!condicion
        : step === 3
          ? indicadorValido
          : step === 4
            ? restFinal.length > 0
            : step === 5
              ? !!tiempo
              : step === 6
                ? !!personas
                : !!presup;

  function next() {
    if (step < total) setStep(step + 1);
    else setSummary(true);
  }

  async function finish() {
    if (!pais || !condicion || !indicadorValido || !tiempo || !personas || !presup) return;
    if (generating) return;
    setGenerating(true);
    try {
      await save({
        data: {
          pais,
          condicion_salud: condicion,
          glucosa_referencia: condicion === "prediabetes" ? glu : null,
          colesterol_nivel: condicion === "cardiovascular" ? colesterol : null,
          circunferencia_cintura: condicion === "sindrome_metabolico" ? cintura : null,
          peso_kg: condicion === "control_peso" ? pesoKg : null,
          estatura_cm: condicion === "control_peso" ? estaturaCm : null,
          restricciones: restFinal,
          tiempo_cocina: tiempo,
          personas,
          presupuesto: presup,
        },
      });
    } catch (e) {
      console.error("[onboarding] saveOnboarding failed", e);
      toast.error(
        e instanceof Error ? e.message : "No pudimos guardar tu perfil. Intenta de nuevo.",
      );
      setGenerating(false);
      return;
    }
    // Plan generation runs in background — don't block navigation
    void genPlan().catch((e) => console.error("[onboarding] genPlan failed", e));
    navigate({ to: "/dashboard", replace: true });
  }

  function encouragement() {
    if (condicion === "cardiovascular")
      return "Con estos hábitos mediterráneos podemos mejorar tu colesterol de forma sostenida. Empecemos.";
    if (condicion === "sindrome_metabolico")
      return "La combinación correcta de porciones y fibra hace una diferencia real en pocas semanas.";
    if (condicion === "control_peso")
      return "Con un plan mediterráneo sostenible, la pérdida de peso se vuelve constante y sin privaciones.";
    return glu === "111-125"
      ? "Con glucosa en ese rango, la consistencia en el plan marca una diferencia real en pocas semanas. Empecemos."
      : glu === "100-110"
        ? "Estás en el momento ideal para actuar. Con este perfil podemos revertir la tendencia con ajustes concretos."
        : "Hola, ya conozco tu punto de partida. Tu primer plan estará listo en segundos.";
  }

  function indicadorLabel(): string {
    if (condicion === "cardiovascular")
      return COLESTEROL_OPCIONES.find((o) => o.id === colesterol)?.label ?? "";
    if (condicion === "sindrome_metabolico")
      return CINTURA_OPCIONES.find((o) => o.id === cintura)?.label ?? "";
    if (condicion === "control_peso" && pesoKg && estaturaCm) {
      const imc = calcularIMC(pesoKg, estaturaCm);
      return `IMC ${imc.toFixed(1)} (${IMC_LABELS[categorizarIMC(imc)]})`;
    }
    return GLUCOSA_OPCIONES.find((o) => o.id === glu)?.label ?? "";
  }

  if (summary) {
    return (
      <div className="app-shell min-h-screen bg-background">
        <main className="px-6 pb-24 pt-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 font-serif text-3xl">Tu perfil está listo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Camila usará esta información para generar tu primer plan personalizado.
          </p>

          <div className="mt-6 space-y-2.5 rounded-2xl border border-border bg-card p-4 text-left">
            <Row label="País" value={paisLabel(pais)} />
            <Row label="Condición" value={condicionLabel(condicion)} />
            <Row label="Indicador" value={indicadorLabel()} />
            <Row
              label="Restricciones"
              value={restFinal.length ? restFinal.map(restLabel).join(", ") : "Ninguna"}
            />
            <Row label="Tiempo de cocina" value={tiempoLabel(tiempo)} />
            <Row label="Personas en casa" value={personasLabel(personas)} />
            <Row label="Presupuesto" value={presupLabel(presup, pais)} />
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-primary-soft p-4 text-left">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-serif text-white">
              C
            </div>
            <p className="text-sm text-primary">{encouragement()}</p>
          </div>

          <button
            onClick={finish}
            disabled={generating}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 text-base font-medium text-accent-foreground disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Generando tu plan…
              </>
            ) : (
              "Ver mi primer plan"
            )}
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
          <span className="text-xs font-medium text-white/80">
            Paso {step} de {total}
          </span>
          <span className="w-9" />
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
      </header>

      <main className="px-6 pb-28 pt-7">
        {step === 1 && (
          <Step
            eyebrow="TU PAÍS"
            title="¿En qué país resides?"
            subtitle="Adaptamos el idioma, los nombres de los ingredientes y lo que consigues en el mercado a tu país."
          >
            <div className="grid grid-cols-2 gap-3">
              {PAISES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPais(p.id)}
                  className={`relative rounded-xl border p-4 text-left text-sm transition-all ${pais === p.id ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
                >
                  <span className="block font-medium">{p.nombre}</span>
                  <span
                    className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border ${pais === p.id ? "border-primary bg-primary text-white" : "border-border bg-card"}`}
                  >
                    {pais === p.id && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step
            eyebrow="TU CONDICIÓN"
            title="¿Cuál es tu condición de salud principal?"
            subtitle="Con esto adaptamos tu plan de Dieta Mediterránea a lo que más te ayuda."
          >
            {CONDICIONES.map((c) => (
              <RadioCard
                key={c.id}
                active={condicion === c.id}
                onClick={() => setCondicion(c.id)}
                title={c.title}
                sub={c.sub}
              />
            ))}
          </Step>
        )}

        {step === 3 && condicion === "prediabetes" && (
          <Step
            eyebrow="TU PUNTO DE PARTIDA"
            title="¿Cuál fue tu resultado de glucosa en ayunas?"
            subtitle="Lo usaremos para personalizar tu plan. No te preocupes si no lo recuerdas exacto."
          >
            {GLUCOSA_OPCIONES.map((o) => (
              <RadioCard
                key={o.id}
                active={glu === o.id}
                onClick={() => setGlu(o.id as Glu)}
                title={o.title}
                sub={o.sub}
              />
            ))}
          </Step>
        )}

        {step === 3 && condicion === "cardiovascular" && (
          <Step
            eyebrow="TU PUNTO DE PARTIDA"
            title="¿Cuál fue tu último resultado de colesterol total?"
            subtitle="Lo usaremos para priorizar grasas saludables en tu plan. No te preocupes si no lo recuerdas exacto."
          >
            {COLESTEROL_OPCIONES.map((o) => (
              <RadioCard
                key={o.id}
                active={colesterol === o.id}
                onClick={() => setColesterol(o.id as Colesterol)}
                title={o.title}
                sub={o.sub}
              />
            ))}
          </Step>
        )}

        {step === 3 && condicion === "sindrome_metabolico" && (
          <Step
            eyebrow="TU PUNTO DE PARTIDA"
            title="¿Cuál es tu circunferencia de cintura?"
            subtitle="Mídela a la altura del ombligo, sin apretar."
          >
            {CINTURA_OPCIONES.map((o) => (
              <RadioCard
                key={o.id}
                active={cintura === o.id}
                onClick={() => setCintura(o.id as Cintura)}
                title={o.title}
                sub={o.sub}
              />
            ))}
          </Step>
        )}

        {step === 3 && condicion === "control_peso" && (
          <Step
            eyebrow="TU PUNTO DE PARTIDA"
            title="Cuéntanos tu peso y estatura"
            subtitle="Calculamos tu IMC para personalizar tu plan de control de peso."
          >
            <NumberField
              label="Peso actual"
              value={pesoKg}
              onChange={setPesoKg}
              suffix="kg"
              placeholder="Ej. 78"
            />
            <NumberField
              label="Estatura"
              value={estaturaCm}
              onChange={setEstaturaCm}
              suffix="cm"
              placeholder="Ej. 165"
            />
            {pesoKg && estaturaCm ? (
              <p className="text-sm text-primary">
                IMC estimado: {calcularIMC(pesoKg, estaturaCm).toFixed(1)} —{" "}
                {IMC_LABELS[categorizarIMC(calcularIMC(pesoKg, estaturaCm))]}
              </p>
            ) : null}
          </Step>
        )}

        {step === 4 && (
          <Step
            eyebrow="LO QUE EVITAMOS"
            title="¿Qué alimentos evitas o no toleras?"
            subtitle="Puedes elegir varias opciones. Tu plan no incluirá estos ingredientes."
          >
            <div className="grid grid-cols-2 gap-3">
              {RESTRICCIONES_OPCIONES.map(({ id, l }) => {
                const sel = id === RESTRICCION_OTRA_ID ? otraSel : rest.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === "ninguno") {
                        setRest(sel ? [] : ["ninguno"]);
                        setOtraSel(false);
                        setOtrasTextos([]);
                      } else if (id === RESTRICCION_OTRA_ID) {
                        setRest((prev) => prev.filter((x) => x !== "ninguno"));
                        setOtraSel(!sel);
                        if (sel) setOtrasTextos([]);
                      } else
                        setRest((prev) => {
                          const cleaned = prev.filter((x) => x !== "ninguno");
                          return sel ? cleaned.filter((x) => x !== id) : [...cleaned, id];
                        });
                    }}
                    className={`relative rounded-xl border p-4 text-left text-sm transition-all ${sel ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
                  >
                    <span className="block font-medium">{l}</span>
                    <span
                      className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border ${sel ? "border-primary bg-primary text-white" : "border-border bg-card"}`}
                    >
                      {sel && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {otraSel && <RestriccionesOtrasInput value={otrasTextos} onChange={setOtrasTextos} />}
          </Step>
        )}

        {step === 5 && (
          <Step
            eyebrow="TU RITMO DE VIDA"
            title="¿Cuánto tiempo tienes para cocinar por comida?"
            subtitle="Diseñaremos recetas que se ajusten a tu disponibilidad real."
          >
            {TIEMPO_OPCIONES.map((o) => (
              <RadioCard
                key={o.id}
                active={tiempo === o.id}
                onClick={() => setTiempo(o.id as Tiempo)}
                title={o.title}
                sub={o.sub}
              />
            ))}
          </Step>
        )}

        {step === 6 && (
          <Step
            eyebrow="TU ENTORNO"
            title="¿Para cuántas personas cocinas?"
            subtitle="Ajustaremos las porciones y la lista de compras a tu realidad."
          >
            {PERSONAS_OPCIONES.map((o) => (
              <RadioCard
                key={o.id}
                active={personas === o.id}
                onClick={() => setPersonas(o.id as Personas)}
                title={o.title}
                sub={o.sub}
              />
            ))}
          </Step>
        )}

        {step === 7 && (
          <Step
            eyebrow="TU PRESUPUESTO"
            title="¿Cuánto destinas a la compra semanal de alimentos?"
            subtitle="Priorizaremos ingredientes accesibles y nutritivos dentro de tu rango."
          >
            {presupuestoOpciones(pais).map((o) => (
              <RadioCard
                key={o.id}
                active={presup === o.id}
                onClick={() => setPresup(o.id as Presup)}
                title={o.title}
                sub={o.sub}
              />
            ))}
          </Step>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background p-4 sm:left-1/2 sm:max-w-[430px] sm:-translate-x-1/2">
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

function Step({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-3 duration-300">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-2xl leading-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6 space-y-3">{children}</div>
    </div>
  );
}

function RadioCard({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${active ? "border-primary bg-primary-soft" : "border-border bg-card"}`}
    >
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border bg-card"}`}
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  suffix: string;
  placeholder: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-lg font-medium outline-none focus:border-primary/40"
        />
        <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
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

function restLabel(r: string) {
  return RESTRICCIONES_OPCIONES.find((o) => o.id === r)?.l.replace(/^\S+\s/, "") ?? r;
}
function tiempoLabel(t: Tiempo | null) {
  return TIEMPO_OPCIONES.find((o) => o.id === t)?.label ?? "";
}
function personasLabel(p: Personas | null) {
  return PERSONAS_OPCIONES.find((o) => o.id === p)?.label ?? "";
}
function presupLabel(p: Presup | null, pais: string | null) {
  return presupuestoOpciones(pais).find((o) => o.id === p)?.label ?? "";
}
