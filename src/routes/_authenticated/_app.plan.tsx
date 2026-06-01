import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Coffee, Sun, Moon, ChevronDown, RefreshCw, Loader2, ShoppingBasket } from "lucide-react";
import { getLatestPlan, generateWeeklyPlan } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/plan")({
  head: () => ({ meta: [{ title: "Mi Plan — Recetario Vital" }] }),
  component: PlanPage,
});

const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
const shortDays = ["L", "M", "X", "J", "V", "S", "D"];

type Comida = { nombre: string; por_que_es_buena?: string; ingredientes?: string[]; pasos?: string[]; ig_nivel?: string; costo_usd?: number };
type Dia = { dia: string; desayuno: Comida; almuerzo: Comida; cena: Comida };
type PlanJson = { semana?: string; dias?: Dia[] };

function PlanPage() {
  const qc = useQueryClient();
  const fetchPlan = useServerFn(getLatestPlan);
  const gen = useServerFn(generateWeeklyPlan);
  const { data: planRow, isLoading } = useQuery({ queryKey: ["plan-latest"], queryFn: () => fetchPlan() });
  const plan = planRow?.plan_json as PlanJson | undefined;

  const todayIdx = (new Date().getDay() + 6) % 7;
  const [active, setActive] = useState(todayIdx);
  const [open, setOpen] = useState<"desayuno" | "almuerzo" | "cena" | null>(null);

  const mut = useMutation({
    mutationFn: () => gen(),
    onSuccess: () => { toast.success("Plan generado"); qc.invalidateQueries({ queryKey: ["plan-latest"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No pudimos generar el plan"),
  });

  const dia = plan?.dias?.[active];

  return (
    <>
      <header className="bg-primary px-5 pb-3 pt-5 text-primary-foreground">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl">Mi plan semanal</h1>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium disabled:opacity-60"
          >
            {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {mut.isPending ? "Generando…" : "Nuevo plan"}
          </button>
        </div>
        <p className="mt-1 text-xs text-white/65">Generado por Camila según tu perfil</p>

        <div className="mt-4 flex gap-1.5 overflow-x-auto">
          {days.map((_, i) => {
            const sel = i === active;
            return (
              <button
                key={i}
                onClick={() => { setActive(i); setOpen(null); }}
                className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-medium ${sel ? "bg-white text-primary" : "border border-white/20 text-white/90"}`}
              >
                <span className="text-[10px] opacity-70">{shortDays[i]}</span>
                <span className="mt-0.5">{i + 1}</span>
                {sel && <span className="mt-0.5 h-1 w-1 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      </header>

      <main className="space-y-3 px-5 py-5">
        {plan && (
          <Link to="/compras" className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4 text-accent">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <ShoppingBasket className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider">Lista de compras</p>
              <p className="text-sm font-medium">Ingredientes consolidados de la semana</p>
            </div>
            <ChevronDown className="h-4 w-4 -rotate-90" />
          </Link>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}

        {!isLoading && !plan && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="font-serif text-lg">Aún no tienes un plan</p>
            <p className="mt-1 text-sm text-muted-foreground">Genera tu primer plan personalizado en segundos.</p>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground disabled:opacity-60"
            >
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mut.isPending ? "Generando tu plan…" : "Generar mi plan"}
            </button>
          </div>
        )}

        {dia && (["desayuno", "almuerzo", "cena"] as const).map((key) => {
          const meal = dia[key];
          const Icon = key === "desayuno" ? Coffee : key === "almuerzo" ? Sun : Moon;
          const time = key === "desayuno" ? "8:00 am" : key === "almuerzo" ? "1:30 pm" : "8:00 pm";
          const isOpen = open === key;
          return (
            <article key={key} className="overflow-hidden rounded-2xl border border-border bg-card">
              <button onClick={() => setOpen(isOpen ? null : key)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{key} · {time}</p>
                  <p className="truncate text-sm font-medium">{meal?.nombre ?? "—"}</p>
                  <div className="mt-1 flex gap-1.5">
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">IG {meal?.ig_nivel ?? "Bajo"}</span>
                    {typeof meal?.costo_usd === "number" && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">${meal.costo_usd.toFixed(2)} USD</span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="space-y-4 border-t border-border p-4">
                  {meal?.por_que_es_buena && (
                    <div className="rounded-xl bg-primary-soft p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">¿Por qué es buena para ti?</p>
                      <p className="mt-1 text-sm text-primary">{meal.por_que_es_buena}</p>
                    </div>
                  )}
                  {meal?.ingredientes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingredientes</p>
                      <ul className="mt-2 space-y-1.5">
                        {meal.ingredientes.map((i, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            <span>{i}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {meal?.pasos && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preparación</p>
                      <ol className="mt-2 space-y-2.5">
                        {meal.pasos.map((p, idx) => (
                          <li key={idx} className="flex gap-3 text-sm">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-medium text-primary-foreground">{idx + 1}</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </main>
    </>
  );
}
