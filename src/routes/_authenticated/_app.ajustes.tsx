import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Globe, Shield, FileText, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  savePushSubscription,
  deletePushSubscription,
  VAPID_PUBLIC_KEY,
} from "@/lib/push.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes — Recetario Vital" }] }),
  component: AjustesPage,
});

const PREFS_KEY = "rv:prefs";
type Prefs = {
  idioma: "es-MX" | "es";
  tema: "claro" | "auto";
};
const defaults: Prefs = {
  idioma: "es-MX",
  tema: "claro",
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function AjustesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const saveSub = useServerFn(savePushSubscription);
  const deleteSub = useServerFn(deletePushSubscription);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...defaults, ...JSON.parse(raw) });
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushEnabled(!!sub);
      } catch {
        /* noop */
      }
    })();
  }, []);

  function update<K extends keyof Prefs>(k: K, v: Prefs[K]) {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    toast.success("Preferencia guardada");
  }

  async function togglePush(next: boolean) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Tu navegador no soporta notificaciones.");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      toast.error("Las notificaciones aún no están configuradas. Intenta más tarde.");
      return;
    }
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (next) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Debes permitir las notificaciones en tu navegador.");
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        const json = sub.toJSON();
        await saveSub({
          data: {
            endpoint: json.endpoint!,
            keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
          },
        });
        setPushEnabled(true);
        toast.success("Recordatorios activados");
      } else {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await deleteSub({ data: { endpoint: sub.endpoint } });
          await sub.unsubscribe();
        }
        setPushEnabled(false);
        toast.success("Recordatorios desactivados");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la preferencia");
    } finally {
      setPushBusy(false);
    }
  }

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            to="/cuenta"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-serif text-lg">Ajustes</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-5 py-5 pb-24 lg:pb-8">
        <Group title="Notificaciones" icon={Bell}>
          <Toggle
            label="Recordatorio diario"
            sub="Un aviso al día si te falta el check-in o generar tu plan"
            value={pushEnabled}
            onChange={togglePush}
            disabled={pushBusy}
          />
        </Group>

        <Group title="Idioma y región" icon={Globe}>
          <Select
            label="Idioma del contenido"
            value={prefs.idioma}
            onChange={(v) => update("idioma", v as Prefs["idioma"])}
            options={[
              ["es-MX", "Español latino"],
              ["es", "Español"],
            ]}
          />
        </Group>

        <Group title="Privacidad" icon={Shield}>
          <Link
            to="/suscripcion"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Mi compra
          </Link>
          <a
            href="mailto:hola@recetariovital.app?subject=Eliminar%20mi%20cuenta"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" /> Solicitar eliminación de cuenta
          </a>
        </Group>

        <Group title="Legal" icon={FileText}>
          <Link
            to="/terminos"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Términos y condiciones
          </Link>
          <Link
            to="/privacidad"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Política de privacidad
          </Link>
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

function Group({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Bell;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="space-y-1 rounded-2xl border border-border bg-card p-2">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  sub,
  value,
  onChange,
  disabled,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted disabled:opacity-60"
    >
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <span
        className={`relative h-6 w-10 rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[1.125rem]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div className="space-y-1 px-3 py-2">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Row({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 text-sm ${muted ? "text-muted-foreground" : "font-medium"}`}
    >
      {label}
    </div>
  );
}
