import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, ShoppingBasket, Check, Download } from "lucide-react";
import { getLatestPlan } from "@/lib/ai.functions";
import { buildShoppingList, type PlanJson } from "@/lib/shopping";

export const Route = createFileRoute("/_authenticated/_app/compras")({
  head: () => ({ meta: [{ title: "Lista de compras — Recetario Vital" }] }),
  component: ComprasPage,
});

function ComprasPage() {
  const fetchPlan = useServerFn(getLatestPlan);
  const { data: planRow } = useQuery({ queryKey: ["plan-latest"], queryFn: () => fetchPlan() });
  const plan = planRow?.plan_json as PlanJson | undefined;
  const categories = useMemo(() => buildShoppingList(plan), [plan]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const total = categories.reduce((n, c) => n + c.items.length, 0);
  const done = checked.size;

  function toggle(k: string) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  function exportTxt() {
    const lines: string[] = ["Lista de compras — Recetario Vital", ""];
    for (const c of categories) {
      lines.push(c.label.toUpperCase());
      for (const i of c.items) lines.push(`  - ${i}`);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lista-compras.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-background px-5 py-4">
        <Link to="/plan" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-serif text-lg">Lista de compras</h1>
        <button onClick={exportTxt} disabled={!total} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card disabled:opacity-40" aria-label="Descargar">
          <Download className="h-4 w-4" />
        </button>
      </header>

      <main className="space-y-4 px-5 py-5 pb-24">
        {!plan && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <ShoppingBasket className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-serif text-lg">Aún no tienes un plan</p>
            <p className="mt-1 text-sm text-muted-foreground">Genera tu plan semanal para ver tu lista de compras consolidada.</p>
            <Link to="/plan" className="mt-4 inline-block rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground">Ir al plan</Link>
          </div>
        )}

        {plan && (
          <div className="rounded-2xl bg-primary-soft p-4 text-primary">
            <p className="text-[10px] font-semibold uppercase tracking-wider">Semana en curso</p>
            <p className="mt-1 font-serif text-xl">{done}/{total} artículos listos</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/50">
              <div className="h-full bg-primary transition-all" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
            </div>
          </div>
        )}

        {categories.map(cat => (
          <section key={cat.key}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{cat.label} · {cat.items.length}</p>
            <ul className="overflow-hidden rounded-2xl border border-border bg-card">
              {cat.items.map((item, idx) => {
                const id = `${cat.key}:${item}`;
                const on = checked.has(id);
                return (
                  <li key={id}>
                    <button onClick={() => toggle(id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm ${idx ? "border-t border-border" : ""} ${on ? "text-muted-foreground line-through" : ""}`}>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="flex-1">{item}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
