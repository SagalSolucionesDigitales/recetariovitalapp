import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Loader2, Download } from "lucide-react";
import { getRecentCheckins, saveCheckin } from "@/lib/checkin.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/progreso")({
  head: () => ({ meta: [{ title: "Progreso — Recetario Vital" }] }),
  component: ProgresoPage,
});

const emojis = ["😞", "😕", "😐", "🙂", "😄"];
const dayLabels = ["L", "M", "X", "J", "V", "S", "D"];

function ProgresoPage() {
  const qc = useQueryClient();
  const fetch = useServerFn(getRecentCheckins);
  const fetchProfile = useServerFn(getMyProfile);
  const save = useServerFn(saveCheckin);
  const { data: checkins } = useQuery({ queryKey: ["checkins"], queryFn: () => fetch() });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const [exporting, setExporting] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCheckin = (checkins ?? []).find(c => c.fecha === todayStr);

  const [score, setScore] = useState<number | null>(null);
  const [siguio, setSiguio] = useState<"si" | "parcial" | "no" | null>(null);
  const [notas, setNotas] = useState("");

  const mut = useMutation({
    mutationFn: () => save({ data: { bienestar_score: score!, siguio_plan: siguio!, notas: notas || null } }),
    onSuccess: () => { toast.success("¡Check-in guardado!"); qc.invalidateQueries({ queryKey: ["checkins"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  async function exportPdf() {
    if (!checkins?.length) { toast.info("Aún no hay registros para exportar."); return; }
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const left = 56;
      let y = 64;
      doc.setFont("helvetica", "bold"); doc.setFontSize(20);
      doc.text("Recetario Vital", left, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110);
      y += 16; doc.text("Historial médico — bienestar y adherencia al plan", left, y);
      y += 22; doc.setTextColor(0); doc.setFontSize(11);
      doc.text(`Nombre: ${profile?.nombre ?? "—"}`, left, y);
      y += 14; doc.text(`Glucosa de referencia: ${profile?.glucosa_referencia ?? "—"}`, left, y);
      y += 14; doc.text(`Fecha de exportación: ${new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}`, left, y);

      y += 22; doc.setDrawColor(200); doc.line(left, y, 556, y);
      y += 22; doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text("Fecha", left, y); doc.text("Bienestar", left + 160, y); doc.text("Adherencia", left + 250, y); doc.text("Notas", left + 360, y);
      y += 6; doc.setDrawColor(220); doc.line(left, y, 556, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);

      const sorted = [...checkins].sort((a, b) => a.fecha.localeCompare(b.fecha));
      const adh: Record<string, string> = { si: "Sí siguió", parcial: "Parcial", no: "No siguió" };
      for (const c of sorted) {
        y += 18;
        if (y > 740) { doc.addPage(); y = 72; }
        doc.text(new Date(c.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" }), left, y);
        doc.text(`${c.bienestar_score ?? "—"} / 5`, left + 160, y);
        doc.text(adh[c.siguio_plan ?? ""] ?? "—", left + 250, y);
        const notes = (c.notas ?? "").slice(0, 60);
        doc.text(notes, left + 360, y);
      }

      const total = sorted.length;
      const avg = total ? (sorted.reduce((a, b) => a + (b.bienestar_score ?? 0), 0) / total).toFixed(2) : "—";
      const adhPct = total ? Math.round(100 * sorted.filter(c => c.siguio_plan === "si").length / total) : 0;
      y += 32;
      if (y > 720) { doc.addPage(); y = 72; }
      doc.setFont("helvetica", "bold"); doc.text("Resumen", left, y);
      y += 14; doc.setFont("helvetica", "normal");
      doc.text(`Registros totales: ${total}`, left, y);
      y += 14; doc.text(`Bienestar promedio: ${avg} / 5`, left, y);
      y += 14; doc.text(`Adherencia completa al plan: ${adhPct}%`, left, y);

      doc.setFontSize(8); doc.setTextColor(140);
      doc.text("Este reporte no reemplaza la consulta médica profesional.", left, 770);
      doc.save(`historial-recetario-vital-${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success("Historial descargado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No pudimos generar el PDF");
    } finally {
      setExporting(false);
    }
  }

  const canSave = score !== null && siguio !== null && !mut.isPending;

  // Week bars (last 7 days, oldest left)
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const c = (checkins ?? []).find(x => x.fecha === key);
    return { key, label: dayLabels[(d.getDay() + 6) % 7], score: c?.bienestar_score ?? 0, today: key === todayStr };
  });
  const wkScores = week.map(w => w.score).filter(n => n > 0);
  const promedio = wkScores.length ? wkScores.reduce((a, b) => a + b, 0) / wkScores.length : 0;

  return (
    <>
      <header className="bg-primary px-5 pb-5 pt-5 text-primary-foreground">
        <h1 className="font-serif text-2xl">Mi progreso</h1>
        <p className="mt-1 text-xs text-white/65">{(checkins?.length ?? 0)} días con Recetario Vital</p>
      </header>

      <main className="space-y-4 px-5 py-5">
        {todayCheckin ? (
          <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <p className="text-sm font-medium text-primary">¡Check-in de hoy guardado! Camila lo verá en tu próxima sesión.</p>
          </div>
        ) : (
          <section className="rounded-2xl bg-accent p-5 text-accent-foreground">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">{formatToday()}</p>
            <h2 className="mt-1 font-serif text-xl">¿Cómo te sentiste hoy?</h2>

            <div className="mt-4 flex justify-between">
              {emojis.map((e, i) => {
                const v = i + 1;
                const sel = score === v;
                return (
                  <button
                    key={v}
                    onClick={() => setScore(v)}
                    className={`grid h-11 w-11 place-items-center rounded-full text-xl transition-transform ${sel ? "scale-110 bg-white/30 ring-2 ring-white" : "bg-white/15"}`}
                  >
                    {e}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex gap-2">
              {([
                ["si", "✓ Sí lo seguí"],
                ["parcial", "~ Parcialmente"],
                ["no", "✗ No lo seguí"],
              ] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setSiguio(v)}
                  className={`flex-1 rounded-full px-2 py-2 text-xs font-medium transition-colors ${siguio === v ? "bg-white text-accent" : "bg-white/15 text-white"}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Algo inusual hoy (opcional)…"
              rows={2}
              className="mt-4 w-full resize-none rounded-xl bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none focus:bg-white/20"
            />

            <button
              onClick={() => mut.mutate()}
              disabled={!canSave}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-accent disabled:opacity-50"
            >
              {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Guardar check-in
            </button>
          </section>
        )}

        {/* Bienestar esta semana */}
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bienestar esta semana</p>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between text-xs">
              <span className="font-medium">Últimos 7 días</span>
              <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">{promedio.toFixed(1)} promedio</span>
            </div>
            <div className="flex items-end justify-between gap-2 h-28">
              {week.map((w) => {
                const h = w.score > 0 ? (w.score / 5) * 100 : 6;
                const color = w.today ? "bg-primary" : w.score <= 2 && w.score > 0 ? "bg-accent-soft" : w.score === 0 ? "bg-border" : "bg-primary-soft";
                return (
                  <div key={w.key} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full flex-1 items-end">
                      <div className={`w-full rounded-md ${color}`} style={{ height: `${h}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{w.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Historial */}
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Historial reciente</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {(checkins ?? []).slice(0, 7).map((c, i) => {
              const dot = c.siguio_plan === "si" ? "bg-primary" : c.siguio_plan === "parcial" ? "bg-accent" : "bg-destructive";
              return (
                <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-border" : ""}`}>
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium">{formatShort(c.fecha)}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.siguio_plan === "si" ? "Siguió el plan" : c.siguio_plan === "parcial" ? "Parcialmente" : "No siguió"}
                      {c.notas ? ` · ${c.notas}` : ""}
                    </p>
                  </div>
                  <span className="font-serif text-2xl text-primary">{c.bienestar_score ?? "—"}</span>
                </div>
              );
            })}
            {!checkins?.length && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aún no tienes check-ins. ¡Empieza con el de hoy!</p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function formatToday() {
  const d = new Date();
  const dia = ["DOMINGO","LUNES","MARTES","MIÉRCOLES","JUEVES","VIERNES","SÁBADO"][d.getDay()];
  const mes = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"][d.getMonth()];
  return `${dia} ${d.getDate()} DE ${mes}`;
}
function formatShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}
