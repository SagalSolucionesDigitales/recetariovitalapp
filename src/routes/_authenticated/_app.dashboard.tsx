import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Flame, SmilePlus, Coffee, Sun, Moon, ArrowRight, Plus, Check, MessageCircle } from "lucide-react";
import { getMyProfile } from "@/lib/profile.functions";
import { getRecentCheckins } from "@/lib/checkin.functions";
import { getLatestPlan } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  head: () => ({ meta: [{ title: "Inicio — Recetario Vital" }] }),
  component: Dashboard,
});

const dayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function computeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function useGreeting() {
  const [g, setG] = useState("Hola");
  useEffect(() => { setG(computeGreeting()); }, []);
  return g;
}

function Dashboard() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchCheckins = useServerFn(getRecentCheckins);
  const fetchPlan = useServerFn(getLatestPlan);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: checkins } = useQuery({ queryKey: ["checkins"], queryFn: () => fetchCheckins() });
  const { data: planRow } = useQuery({ queryKey: ["plan-latest"], queryFn: () => fetchPlan() });

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayCheckin = (checkins ?? []).find(c => c.fecha === todayStr);
  const racha = computeStreak(checkins ?? []);
  const promedio = computeAvgWellness(checkins ?? []);

  const dayName = dayLabels[today.getDay()];
  const plan = planRow?.plan_json as PlanJson | undefined;
  const todayPlan = plan?.dias?.find(d => d.dia === dayName);

  const initials = (profile?.nombre ?? "Hola").slice(0, 2).toUpperCase();

  return (
    <>
      <header className="bg-primary px-5 pb-6 pt-5 text-primary-foreground">
        <div className="flex items-center justify-between">
          <span className="font-serif text-lg">Recetario <em className="italic">Vital</em></span>
          <Link to="/cuenta" className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/15 text-xs font-medium">
            {initials}
          </Link>
        </div>
        <h1 className="mt-5 font-serif text-2xl" suppressHydrationWarning>{useGreeting()}, {profile?.nombre ?? "👋"}</h1>
        <p className="mt-1 text-xs text-white/65">
          {dayName} · Semana en curso{racha > 0 ? ` · ${racha} días seguidos ✓` : ""}
        </p>
      </header>

      <main className="space-y-3.5 px-5 py-5">
        {/* Check-in */}
        {todayCheckin ? (
          <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <p className="text-sm font-medium text-primary">Check-in de hoy completado</p>
          </div>
        ) : (
          <Link to="/progreso" className="flex items-center justify-between rounded-2xl bg-accent p-4 text-accent-foreground">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">Pendiente hoy</p>
              <p className="mt-1 font-serif text-lg leading-tight">Registra cómo te sientes</p>
              <p className="mt-0.5 text-xs text-white/75">Tarda menos de 1 minuto</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
              <Plus className="h-5 w-5" />
            </span>
          </Link>
        )}

        {/* Plan de hoy */}
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Plan de hoy</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between bg-primary-soft px-4 py-2.5 text-xs">
              <span className="font-medium text-primary">{dayName}</span>
              <Link to="/plan" className="font-medium text-primary">Ver semana completa →</Link>
            </div>
            <div className="divide-y divide-border">
              <MealRow icon={Coffee} label="Desayuno" name={todayPlan?.desayuno?.nombre ?? "Aún no generado"} />
              <MealRow icon={Sun} label="Almuerzo" name={todayPlan?.almuerzo?.nombre ?? "Aún no generado"} />
              <MealRow icon={Moon} label="Cena" name={todayPlan?.cena?.nombre ?? "Aún no generado"} />
            </div>
            {!plan && (
              <div className="border-t border-border p-3">
                <Link to="/plan" className="block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-xs font-medium text-primary-foreground">
                  Generar mi primer plan
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Esta semana */}
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Esta semana</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <Flame className="h-5 w-5 text-accent" />
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">¡Racha!</span>
              </div>
              <p className="mt-3 font-serif text-3xl">{racha}</p>
              <p className="text-xs text-muted-foreground">días siguiendo el plan</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <SmilePlus className="h-5 w-5 text-primary" />
              <p className="mt-3 font-serif text-3xl">{promedio.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">bienestar promedio / 5</p>
            </div>
          </div>
        </section>

        {/* Camila */}
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Coach Camila</p>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-serif text-white">C</div>
              <div className="flex-1 rounded-2xl rounded-tl-none bg-primary-soft p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Camila — Coach de nutrición</p>
                <p className="mt-1 text-sm text-foreground">
                  {checkins && checkins.length > 0
                    ? `Tu bienestar promedio es ${promedio.toFixed(1)}/5. ${promedio >= 4 ? "Vas excelente, mantengamos el ritmo." : "Estoy viendo oportunidades para ajustar tu plan. ¿Hablamos?"}`
                    : "Aún no tengo registros tuyos. Cuando hagas tu primer check-in, te daré observaciones específicas."}
                </p>
              </div>
            </div>
            <Link to="/coach" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
              <MessageCircle className="h-4 w-4" />
              Responder a Camila <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

type Comida = { nombre: string; por_que_es_buena?: string; ingredientes?: string[]; pasos?: string[]; ig_nivel?: string; costo_usd?: number };
type Dia = { dia: string; desayuno: Comida; almuerzo: Comida; cena: Comida };
type PlanJson = { semana?: string; dias?: Dia[] };

function MealRow({ icon: Icon, label, name }: { icon: typeof Coffee; label: string; name: string }) {
  return (
    <Link to="/plan" className="flex items-center gap-3 px-4 py-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{name}</p>
      </div>
      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">IG Bajo</span>
    </Link>
  );
}

function computeStreak(checkins: Array<{ fecha: string; siguio_plan: string | null }>): number {
  const set = new Set(checkins.filter(c => c.siguio_plan === "si" || c.siguio_plan === "parcial").map(c => c.fecha));
  let n = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const key = d.toISOString().slice(0, 10);
    if (set.has(key)) n++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function computeAvgWellness(checkins: Array<{ bienestar_score: number | null }>): number {
  const vals = checkins.map(c => c.bienestar_score).filter((v): v is number => typeof v === "number");
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
