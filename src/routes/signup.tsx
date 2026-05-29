import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ShieldCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
    const { error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSuccess(true);
  }

  async function googleSignup() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (r.error) toast.error("No pudimos iniciar sesión con Google.");
  }

  if (success) {
    return (
      <div className="app-shell flex min-h-screen flex-col items-center justify-center bg-primary px-6 text-center text-white">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15">
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <h1 className="mt-6 font-serif text-3xl">¡Tu cuenta está lista!</h1>
        <p className="mt-3 max-w-xs text-sm text-white/75">
          Tienes 7 días con acceso completo. Vamos a armar tu perfil para que tu primer plan se ajuste a ti.
        </p>
        <button
          onClick={() => navigate({ to: "/onboarding" })}
          className="mt-8 w-full rounded-2xl bg-accent px-5 py-4 text-base font-medium text-accent-foreground"
        >
          Armar mi perfil
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen">
      <header className="flex items-center justify-between px-5 pt-5">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium text-muted-foreground">Crear cuenta</span>
        <span className="font-serif text-lg italic text-primary">RV</span>
      </header>

      <main className="px-6 pb-12 pt-6">
        <h1 className="font-serif text-[27px] leading-tight">Crea tu cuenta gratuita</h1>
        <p className="mt-2 text-sm text-muted-foreground">7 días con acceso completo. Sin tarjeta de crédito.</p>

        <button
          onClick={googleSignup}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-primary-soft"
        >
          <GoogleIcon />
          Continuar con Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          o usa tu correo
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={signupEmail} className="space-y-3">
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
            <Field icon={<Lock className="h-4 w-4" />} trailing={
              <button type="button" onClick={() => setShowPw(s => !s)} className="text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }>
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
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full ${strength >= i ? (strength === 1 ? "bg-destructive" : strength === 2 ? "bg-accent" : "bg-primary") : "bg-border"}`} />
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
              Acepto los <a className="font-medium text-primary underline-offset-2 hover:underline">Términos de uso</a> y la <a className="font-medium text-primary underline-offset-2 hover:underline">Política de privacidad</a>. Entiendo que Recetario Vital no reemplaza la consulta médica.
            </span>
          </label>

          <button
            type="submit"
            disabled={!valid || loading}
            className="mt-2 w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Creando cuenta…" : "Crear cuenta gratis"}
          </button>
        </form>

        <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
          Después del período de prueba, $9.99 USD/mes. Cancela cuando quieras.
        </p>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Inicia sesión</Link>
        </p>
      </main>
    </div>
  );
}

function Field({ icon, trailing, children }: { icon: React.ReactNode; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30">
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex-1">{children}</div>
      {trailing}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29.1 4.5 24 4.5 16.1 4.5 9.3 9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5.1c-2 1.4-4.4 2.2-7 2.2-5.3 0-9.7-3.1-11.3-7.4l-6.5 5C8.9 39 15.9 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6 5.1C40.7 35.6 43.5 30.3 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
