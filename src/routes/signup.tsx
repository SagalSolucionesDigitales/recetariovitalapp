import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Crear cuenta — Recetario Vital" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: SignupPage,
});

function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 3) as 0 | 1 | 2 | 3;
}

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = passwordStrength(pw);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const valid = useMemo(
    () => emailValid && pw.length >= 8 && pw === pw2 && accept,
    [emailValid, pw, pw2, accept],
  );

  async function signupEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    const { data: eligible, error: eligibilityError } = await supabase.rpc("check_hotmart_access", {
      p_email: normalizedEmail,
    });
    if (eligibilityError || !eligible) {
      setLoading(false);
      toast.error(
        "No encontramos una compra aprobada en Hotmart con este correo. Usa el mismo correo de tu compra o contacta soporte.",
      );
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: pw,
      options: {
        emailRedirectTo: window.location.origin + "/onboarding",
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Forzamos cierre de sesión por si Supabase devolvió tokens automáticamente.
    // El usuario debe confirmar su correo antes de entrar a la app.
    await supabase.auth.signOut().catch(() => {});
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="app-shell flex min-h-screen flex-col items-center justify-center bg-primary px-6 text-center text-white">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15">
          <Mail className="h-8 w-8" strokeWidth={2} />
        </div>
        <h1 className="mt-6 font-serif text-[32px] leading-tight">¡Revisa tu correo!</h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/85">
          Te enviamos un correo a <span className="font-medium text-white">{email}</span> para
          confirmar tu cuenta. Haz clic en el enlace del correo y luego inicia sesión para empezar.
        </p>
        <p className="mt-4 max-w-xs text-xs text-white/65">
          ¿No lo ves? Revisa tu carpeta de spam.
        </p>
        <button
          onClick={() => navigate({ to: "/login" })}
          className="mt-8 w-full max-w-sm rounded-2xl bg-accent px-5 py-4 text-base font-medium text-accent-foreground"
        >
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen">
      <header className="flex items-center justify-between px-5 pt-5">
        <Link
          to="/"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium text-muted-foreground">Crear cuenta</span>
        <span className="font-serif text-lg italic text-primary">RV</span>
      </header>

      <main className="px-6 pb-12 pt-6">
        <h1 className="font-serif text-[27px] leading-tight">Crea tu cuenta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Usa el mismo correo con el que compraste en Hotmart — es como verificamos tu acceso.
        </p>

        <form onSubmit={signupEmail} className="mt-6 space-y-3">
          <Field icon={<Mail className="h-4 w-4" />}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </Field>

          <div>
            <Field
              icon={<Lock className="h-4 w-4" />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="text-muted-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            >
              <input
                type={showPw ? "text" : "password"}
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Contraseña (mín. 8 caracteres)"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </Field>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${strength >= i ? (strength === 1 ? "bg-destructive" : strength === 2 ? "bg-accent" : "bg-primary") : "bg-border"}`}
                />
              ))}
            </div>
          </div>

          <Field icon={<Lock className="h-4 w-4" />}>
            <input
              type={showPw ? "text" : "password"}
              required
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Confirmar contraseña"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </Field>

          <label className="mt-2 flex items-start gap-3 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              Acepto los{" "}
              <Link
                to="/terminos"
                target="_blank"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Términos de uso
              </Link>{" "}
              y la{" "}
              <Link
                to="/privacidad"
                target="_blank"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Política de privacidad
              </Link>
              . Entiendo que Recetario Vital no reemplaza la consulta médica.
            </span>
          </label>

          <button
            type="submit"
            disabled={!valid || loading}
            className="mt-2 w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
          Acceso completo con tu compra única — sin pagos recurrentes.
        </p>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </main>
    </div>
  );
}

function Field({
  icon,
  trailing,
  children,
}: {
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30">
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex-1">{children}</div>
      {trailing}
    </div>
  );
}
