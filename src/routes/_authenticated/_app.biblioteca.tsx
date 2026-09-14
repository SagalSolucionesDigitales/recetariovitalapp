import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Salad, Leaf, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_app/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca — Recetario Vital" }] }),
  component: BibliotecaPage,
});

const RECURSOS = [
  {
    path: "recetario-vital.pdf",
    titulo: "Recetario Vital",
    descripcion: "El recetario original completo, para tenerlo siempre a la mano.",
    icon: BookOpen,
  },
  {
    path: "keto-facil.pdf",
    titulo: "Keto Fácil",
    descripcion: "Bono exclusivo: guía práctica para comer keto sin complicarte.",
    icon: Salad,
  },
  {
    path: "detox-natural.pdf",
    titulo: "Detox Natural",
    descripcion: "Bono exclusivo: plan de desintoxicación con ingredientes naturales.",
    icon: Leaf,
  },
] as const;

function BibliotecaPage() {
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

  async function descargar(path: string, titulo: string) {
    setLoadingPath(path);
    try {
      const { data, error } = await supabase.storage
        .from("biblioteca")
        .createSignedUrl(path, 60 * 5);
      if (error || !data?.signedUrl) {
        toast.error("No pudimos generar el enlace de descarga. Intenta de nuevo.");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(`No pudimos abrir "${titulo}". Intenta de nuevo.`);
    } finally {
      setLoadingPath(null);
    }
  }

  return (
    <>
      <header className="bg-primary px-5 pb-5 pt-5 text-primary-foreground">
        <h1 className="font-serif text-2xl">Biblioteca</h1>
        <p className="mt-1 text-xs text-white/65">
          Tu recetario y los bonos exclusivos de tu compra.
        </p>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-5 py-5 pb-24 lg:pb-8">
        {RECURSOS.map(({ path, titulo, descripcion, icon: Icon }) => {
          const loading = loadingPath === path;
          return (
            <div
              key={path}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{titulo}</p>
                <p className="text-xs text-muted-foreground">{descripcion}</p>
              </div>
              <button
                onClick={() => descargar(path, titulo)}
                disabled={loading}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-medium text-accent-foreground disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                PDF
              </button>
            </div>
          );
        })}
      </main>
    </>
  );
}
