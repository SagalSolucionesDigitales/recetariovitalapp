import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Globe, Shield, FileText, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes — Recetario Vital" }] }),
  component: AjustesPage,
});

const PREFS_KEY = "rv:prefs";
type Prefs = { recordatorioCheckin: boolean; recordatorioComidas: boolean; idioma: "es-MX" | "es"; tema: "claro" | "auto" };
const defaults: Prefs = { recordatorioCheckin: true, recordatorioComidas: false, idioma: "es-MX", tema: "claro" };

function AjustesPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(defaults);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...defaults, ...JSON.parse(raw) });
    } catch { /* noop */ }
  }, []);

  function update<K extends keyof Prefs>(k: K, v: Prefs[K]) {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    toast.success("Preferencia guardada");
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-background px-5 py-4">
        <Link to="/cuenta" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-serif text-lg">Ajustes</h1>
        <span className="w-9" />
      </header>

      <main className="space-y-5 px-5 py-5 pb-24">
        <Group title="Notificaciones" icon={Bell}>
          <Toggle label="Recordatorio diario de check-in" sub="Te avisamos a las 8 pm" value={prefs.recordatorioCheckin} onChange={(v) => update("recordatorioCheckin", v)} />
          <Toggle label="Recordatorios de comidas" sub="Notificación a la hora de cada comida" value={prefs.recordatorioComidas} onChange={(v) => update("recordatorioComidas", v)} />
        </Group>

        <Group title="Idioma y región" icon={Globe}>
          <Select label="Idioma del contenido" value={prefs.idioma} onChange={(v) => update("idioma", v as Prefs["idioma"])} options={[["es-MX", "Español (México)"], ["es", "Español neutro"]]} />
        </Group>

        <Group title="Privacidad" icon={Shield}>
          <Link to="/suscripcion" className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted">
            Administrar suscripción
          </Link>
          <a href="mailto:hola@recetariovital.app?subject=Eliminar%20mi%20cuenta" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-muted">
            <Trash2 className="h-4 w-4" /> Solicitar eliminación de cuenta
          </a>
        </Group>

        <Group title="Legal" icon={FileText}>
          <Row label="Términos y condiciones" />
          <Row label="Política de privacidad" />
          <Row label="Recetario Vital · v1.0" muted />
        </Group>

        <button
          onClick={logout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-destructive"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>

        <p className="px-1 pt-1 text-center text-[11px] text-muted-foreground">
          Este asistente no reemplaza la consulta médica profesional.
        </p>
      </main>
    </>
  );
}

function Group({ title, icon: Icon, children }: { title: string; icon: typeof Bell; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="space-y-1 rounded-2xl border border-border bg-card p-2">{children}</div>
    </section>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <span className={`relative h-6 w-10 rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[1.125rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <div className="space-y-1 px-3 py-2">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function Row({ label, muted }: { label: string; muted?: boolean }) {
  return <div className={`rounded-xl px-3 py-2.5 text-sm ${muted ? "text-muted-foreground" : "font-medium"}`}>{label}</div>;
}
