import { useEffect, useState } from "react";
import { Download, Share2, MoreVertical } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __rvInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIOS());

    // The event may have already fired (and been captured by the inline
    // script in <head>) on an earlier route, before this component mounted.
    if (window.__rvInstallPrompt) setDeferred(window.__rvInstallPrompt);

    function onPromptReady() {
      if (window.__rvInstallPrompt) setDeferred(window.__rvInstallPrompt);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }
    window.addEventListener("rv-install-prompt-ready", onPromptReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("rv-install-prompt-ready", onPromptReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Always visible until installed — Chrome/Edge only expose the automatic
  // prompt after their own engagement heuristics decide to fire it, so an
  // Android/desktop visitor without `deferred` yet still gets a button with
  // manual instructions instead of nothing.
  if (installed) return null;

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      window.__rvInstallPrompt = null;
      return;
    }
    setShowHelp(true);
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground"
      >
        <Download className="h-4 w-4" />
        Instala la app en tu teléfono
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg">Instala Recetario Vital</p>
            {ios ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Toca el ícono <Share2 className="inline h-4 w-4" strokeWidth={2} /> "Compartir" en
                Safari y luego elige <strong>"Agregar a pantalla de inicio"</strong>.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Toca el menú <MoreVertical className="inline h-4 w-4" strokeWidth={2} /> de tu
                navegador y elige <strong>"Instalar aplicación"</strong> o{" "}
                <strong>"Agregar a pantalla de inicio"</strong>.
              </p>
            )}
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
