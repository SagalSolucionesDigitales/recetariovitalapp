import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-serif text-primary">404</h1>
        <h2 className="mt-4 text-xl font-serif text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-serif text-foreground">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No pudimos cargar esta página. Puedes reintentar o volver al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Recetario Vital App — Dieta diabética personalizada" },
      {
        name: "description",
        content:
          "Dieta diabética personalizada: plan semanal según tu perfil y tu país, coach de nutrición 24/7 y seguimiento de tu progreso. Pago único, sin suscripciones.",
      },
      { name: "theme-color", content: "#1B5233" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Recetario Vital" },
      {
        property: "og:title",
        content: "Recetario Vital App — Dieta diabética personalizada",
      },
      {
        property: "og:description",
        content:
          "Dieta diabética personalizada: plan semanal según tu perfil y tu país, coach de nutrición 24/7 y seguimiento de tu progreso. Pago único, sin suscripciones.",
      },
      { property: "og:type", content: "website" },
      {
        name: "twitter:title",
        content: "Recetario Vital App — Dieta diabética personalizada",
      },
      {
        name: "twitter:description",
        content:
          "Dieta diabética personalizada: plan semanal según tu perfil y tu país, coach de nutrición 24/7 y seguimiento de tu progreso. Pago único, sin suscripciones.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/74d17e9c-84e7-4160-80b9-8ddc87bdc1f0/id-preview-55c56216--9ff0291d-9e08-474e-8e3d-c4a50f445652.lovable.app-1780689336227.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/74d17e9c-84e7-4160-80b9-8ddc87bdc1f0/id-preview-55c56216--9ff0291d-9e08-474e-8e3d-c4a50f445652.lovable.app-1780689336227.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-180.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=DM+Serif+Display:ital@0;1&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const CAPTURE_INSTALL_PROMPT_SCRIPT = `
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    window.__rvInstallPrompt = e;
    window.dispatchEvent(new Event("rv-install-prompt-ready"));
  });
  window.addEventListener("appinstalled", function () {
    window.__rvInstallPrompt = null;
  });
`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
        {/* Runs before hydration so we never miss beforeinstallprompt if it
            fires on an earlier route (landing, login, onboarding) than the
            one that renders InstallAppButton. */}
        <script dangerouslySetInnerHTML={{ __html: CAPTURE_INSTALL_PROMPT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        await queryClient.cancelQueries();
        queryClient.clear();
        router.invalidate();
        return;
      }

      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.access_token) {
        router.invalidate();
        queryClient.invalidateQueries();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <ServiceWorkerRegister />
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
