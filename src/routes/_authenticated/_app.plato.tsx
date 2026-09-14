import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Flame, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeMealPhoto,
  getMealAnalyses,
  deleteMealAnalysis,
  type AnalisisPlato,
} from "@/lib/meal.functions";

export const Route = createFileRoute("/_authenticated/_app/plato")({
  head: () => ({ meta: [{ title: "Analiza tu plato — Recetario Vital" }] }),
  component: PlatoPage,
});

const SEMAFORO_COLOR: Record<string, string> = {
  verde: "bg-primary",
  amarillo: "bg-accent",
  rojo: "bg-destructive",
};
const SEMAFORO_LABEL: Record<string, string> = {
  verde: "Adecuado para ti",
  amarillo: "Modéralo",
  rojo: "Evítalo o reduce mucho la porción",
};

function PlatoPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const listFn = useServerFn(getMealAnalyses);
  const analyzeFn = useServerFn(analyzeMealPhoto);
  const deleteFn = useServerFn(deleteMealAnalysis);

  const { data: historial } = useQuery({ queryKey: ["meal-analyses"], queryFn: () => listFn() });

  const analyzeMut = useMutation({
    mutationFn: async (photo: File) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      const ext = photo.type === "image/png" ? "png" : "jpg";
      const path = `${userData.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("meal-photos")
        .upload(path, photo, { contentType: photo.type });
      if (uploadError) throw new Error("No pudimos subir la foto. Intenta de nuevo.");
      return analyzeFn({ data: { path } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-analyses"] });
      toast.success("¡Plato analizado!");
      setFile(null);
      setPreviewUrl(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No pudimos analizar la foto."),
  });

  const deleteMut = useMutation({
    mutationFn: (row: { id: string; foto_path: string }) => deleteFn({ data: row }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meal-analyses"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo eliminar"),
  });

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  const latest = analyzeMut.data;
  const latestResult = latest?.resultado_json as unknown as AnalisisPlato | undefined;

  return (
    <>
      <header className="bg-primary px-5 pb-5 pt-5 text-primary-foreground">
        <h1 className="font-serif text-2xl">Analiza tu plato</h1>
        <p className="mt-1 text-xs text-white/65">
          Fotografía tu comida y Camila estima porciones, calorías y su efecto en tu condición.
        </p>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-5 py-5 pb-24 lg:pb-8">
        <section className="rounded-2xl border border-border bg-card p-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPickFile}
            className="hidden"
          />

          {!previewUrl ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              <Camera className="h-8 w-8" strokeWidth={1.6} />
              Fotografiar plato
            </button>
          ) : (
            <div className="space-y-3">
              <img
                src={previewUrl}
                alt="Foto del plato"
                className="max-h-72 w-full rounded-xl object-cover"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={analyzeMut.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4" /> Cambiar foto
                </button>
                <button
                  onClick={() => file && analyzeMut.mutate(file)}
                  disabled={analyzeMut.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground disabled:opacity-60"
                >
                  {analyzeMut.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Analizando…
                    </>
                  ) : (
                    "Analizar plato"
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        {latestResult && (
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div
              className={`px-4 py-2.5 text-xs font-semibold text-white ${SEMAFORO_COLOR[latestResult.semaforo] ?? "bg-muted-foreground"}`}
            >
              {SEMAFORO_LABEL[latestResult.semaforo] ?? latestResult.semaforo}
            </div>
            <div className="p-4">
              <h2 className="font-serif text-xl">{latestResult.nombre_plato}</h2>
              <p className="text-xs text-muted-foreground">{latestResult.porcion_estimada}</p>

              <div className="mt-3 flex items-center gap-2 text-primary">
                <Flame className="h-5 w-5" />
                <span className="font-serif text-2xl">{latestResult.calorias_kcal}</span>
                <span className="text-xs text-muted-foreground">kcal (estimado)</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <Macro label="Carbs" value={`${latestResult.carbohidratos_g} g`} />
                <Macro label="Azúcares" value={`${latestResult.azucares_g} g`} />
                <Macro label="Proteína" value={`${latestResult.proteina_g} g`} />
                <Macro label="Grasa" value={`${latestResult.grasa_g} g`} />
                <Macro label="Grasa sat." value={`${latestResult.grasa_saturada_g} g`} />
                <Macro label="Fibra" value={`${latestResult.fibra_g} g`} />
                <Macro label="Sodio" value={`${latestResult.sodio_mg} mg`} />
                <Macro label="Índice glucémico" value={latestResult.indice_glucemico} />
              </div>

              <p className="mt-4 text-sm">{latestResult.evaluacion}</p>
              <p className="mt-2 rounded-xl bg-primary-soft p-3 text-xs text-primary">
                💡 {latestResult.sugerencia}
              </p>
              <p className="mt-3 text-[10px] text-muted-foreground">
                Estimación visual, no reemplaza una medición nutricional exacta ni consulta médica.
              </p>
            </div>
          </section>
        )}

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Historial de platos
          </p>
          <div className="space-y-2">
            {(historial ?? []).map((row) => {
              const r = row.resultado_json as unknown as AnalisisPlato;
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  {row.foto_url ? (
                    <img
                      src={row.foto_url}
                      alt={r.nombre_plato}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-muted">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${SEMAFORO_COLOR[r.semaforo] ?? "bg-muted-foreground"}`}
                      />
                      <p className="truncate text-sm font-medium">{r.nombre_plato}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {r.calorias_kcal} kcal · {formatShort(row.creado_en)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMut.mutate({ id: row.id, foto_path: row.foto_path })}
                    disabled={deleteMut.isPending}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {!historial?.length && (
              <p className="rounded-2xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                Aún no has analizado ningún plato.
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <p className="font-medium">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
