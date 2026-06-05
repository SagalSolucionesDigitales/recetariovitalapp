import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, User, CreditCard, Settings, LogOut, Loader2, Check } from "lucide-react";
import { getMyProfile, updateProfileBasics } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/cuenta")({
  head: () => ({ meta: [{ title: "Mi cuenta — Recetario Vital" }] }),
  component: CuentaPage,
});

function CuentaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetch = useServerFn(getMyProfile);
  const update = useServerFn(updateProfileBasics);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetch() });

  const [nombre, setNombre] = useState("");
  const [glu, setGlu] = useState<string>("");
  const [rest, setRest] = useState<string[]>([]);
  const [tiempo, setTiempo] = useState<string>("");
  const [personas, setPersonas] = useState<string>("");
  const [presup, setPresup] = useState<string>("");

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre ?? "");
      setGlu(profile.glucosa_referencia ?? "");
      setRest(profile.restricciones ?? []);
      setTiempo(profile.tiempo_cocina ?? "");
      setPersonas(profile.personas ?? "");
      setPresup(profile.presupuesto ?? "");
    }
  }, [profile]);

  const mut = useMutation({
    mutationFn: () => update({ data: {
      nombre: nombre || undefined,
      glucosa_referencia: (glu || undefined) as never,
      restricciones: rest,
      tiempo_cocina: (tiempo || undefined) as never,
      personas: (personas || undefined) as never,
      presupuesto: (presup || undefined) as never,
    } }),
    onSuccess: () => { toast.success("Cambios guardados"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const initials = (nombre || "RV").slice(0, 2).toUpperCase();

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-background px-5 py-4">
        <Link to="/dashboard" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-serif text-lg">Mi cuenta</h1>
        <span className="w-9" />
      </header>

      <main className="space-y-4 px-5 py-5">
        <section className="rounded-2xl border border-border bg-card p-5 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary font-serif text-xl text-primary-foreground">
            {initials}
          </div>
          <p className="mt-3 font-serif text-lg">{nombre || "Tu cuenta"}</p>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Datos personales</p>
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <Label>Nombre</Label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40" />
          </div>
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Perfil de salud</p>
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <Select label="Nivel de glucosa" value={glu} onChange={setGlu} options={[
              ["100-110", "100–110 mg/dL"],
              ["111-125", "111–125 mg/dL"],
              ["no-se", "No lo sé exactamente"],
            ]} />
            <MultiCheck label="Restricciones alimentarias" value={rest} onChange={setRest} />
            <Select label="Tiempo de cocina" value={tiempo} onChange={setTiempo} options={[
              ["menos15", "Menos de 15 min"],
              ["15-30", "15–30 min"],
              ["mas30", "Más de 30 min"],
            ]} />
            <Select label="Personas en casa" value={personas} onChange={setPersonas} options={[
              ["1", "Solo para mí"],
              ["2", "Para 2 personas"],
              ["3+", "Para 3 o más"],
            ]} />
            <Select label="Presupuesto semanal" value={presup} onChange={setPresup} options={[
              ["menos500", "Menos de $500 MXN"],
              ["500-1000", "$500–$1,000 MXN"],
              ["mas1000", "Más de $1,000 MXN"],
            ]} />
          </div>
        </section>

        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar cambios
        </button>

        <section>
          <div className="space-y-1 rounded-2xl border border-border bg-card p-2">
            <Link to="/suscripcion" className="block">
              <Row icon={CreditCard} label="Suscripción" sub="Período de prueba — 7 días gratis" />
            </Link>
            <Link to="/ajustes" className="block">
              <Row icon={Settings} label="Ajustes" sub="Notificaciones, idioma, privacidad" />
            </Link>
            <Row icon={User} label="Términos y privacidad" sub="Recetario Vital v1.0" />
          </div>
        </section>

        <button
          onClick={logout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-destructive"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </main>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{children}</label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40">
        <option value="">Selecciona…</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function MultiCheck({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const options = [
    ["gluten", "🌾 Gluten"],
    ["lacteos", "🥛 Lácteos"],
    ["mariscos", "🦐 Mariscos"],
    ["cerdo", "🥩 Cerdo"],
    ["picante", "🌶️ Picante"],
    ["ninguno", "✅ Ninguno"],
  ] as const;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map(([id, text]) => {
          const selected = value.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === "ninguno") onChange(selected ? [] : ["ninguno"]);
                else onChange(selected ? value.filter(x => x !== id) : [...value.filter(x => x !== "ninguno"), id]);
              }}
              className={`flex min-h-11 items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${selected ? "border-primary bg-primary-soft" : "border-border bg-background"}`}
            >
              <span>{text}</span>
              {selected && <Check className="h-4 w-4 text-primary" strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, sub }: { icon: typeof User; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
