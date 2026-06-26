import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Inicia sesión — Recetario Vital" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loginEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) { toast.error("Correo o contraseña incorrectos."); return; }
    navigate({ to: "/dashboard" });
  }

  async function googleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    if (error) toast.error("No pudimos iniciar sesión con Google.");
  }

  return (
    <div className="app-shell min-h-screen">
      <header className="flex items-center justify-between px-5 pt-5">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium text-muted-foreground">Inicia sesión</span>
        <span className="font-serif text-lg italic text-primary">RV</span>
      </header>

      <main className="px-6 pb-12 pt-6">
        <h1 className="font-serif text-[27px] leading-tight">Bienvenido de vuelta</h1>
        <p className="mt-2 text-sm text-muted-foreground">Continúa con tu plan personalizado.</p>

        <button onClick={googleLogin}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-primary-soft">
          Continuar con Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> o usa tu correo <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={loginEmail} className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input type={showPw ? "text" : "password"} required value={pw} onChange={(e)=>setPw(e.target.value)}
              placeholder="Contraseña"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <button type="button" onClick={()=>setShowPw(s=>!s)} className="text-muted-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button type="submit" disabled={loading}
            className="mt-2 w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-40">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">Crea una gratis</Link>
        </p>
      </main>
    </div>
  );
}
