import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacidad")({
  head: () => ({ meta: [{ title: "Política de privacidad — Recetario Vital" }] }),
  component: PrivacidadPage,
});

function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-serif text-lg">Política de privacidad</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-5 py-6 pb-16 text-sm leading-relaxed text-foreground">
        <p className="text-xs text-muted-foreground">
          Última actualización: 16 de septiembre de 2026
        </p>

        <Section title="1. Qué información recopilamos">
          Correo electrónico y nombre; tu perfil de salud (condición principal, indicadores clínicos
          autoreportados como glucosa, colesterol o cintura, peso y estatura, restricciones
          alimentarias); tu país; tus fotos de platos de comida y el análisis nutricional generado a
          partir de ellas; tus check-ins de bienestar; y tus conversaciones con Camila.
        </Section>

        <Section title="2. Para qué la usamos">
          Para generar tu plan de alimentación personalizado, responder tus preguntas a través de
          Camila, estimar la información nutricional de tus fotos de comida, verificar que tengas
          una compra aprobada en Hotmart asociada a tu correo, y mostrarte tu propio historial de
          progreso.
        </Section>

        <Section title="3. Datos de salud">
          Los datos de salud que compartes son sensibles y los tratamos con especial cuidado: solo
          se usan para personalizar tu experiencia dentro de la app y nunca se venden ni se usan con
          fines publicitarios.
        </Section>

        <Section title="4. Con quién se comparte">
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>
              <strong>Google (Gemini API):</strong> procesa tu perfil y tus fotos de platos para
              generar el plan de alimentación, las respuestas de Camila y el análisis nutricional.
            </li>
            <li>
              <strong>Supabase:</strong> aloja de forma segura la base de datos y los archivos
              (fotos de platos, PDFs) de la app.
            </li>
            <li>
              <strong>Hotmart:</strong> nos notifica el estado de tu compra (aprobada, reembolsada,
              etc.) para verificar tu acceso; no compartimos con Hotmart tu información de salud.
            </li>
          </ul>
          No vendemos ni compartimos tu información con terceros para fines de marketing.
        </Section>

        <Section title="5. Seguridad">
          Tu información está protegida con reglas de acceso a nivel de base de datos (Row Level
          Security): solo tú puedes ver tus propios datos, fotos y conversaciones. Las conexiones a
          la app y a nuestros proveedores se realizan de forma cifrada (HTTPS).
        </Section>

        <Section title="6. Cuánto tiempo conservamos tus datos">
          Conservamos tu información mientras tu cuenta esté activa. Si solicitas la eliminación de
          tu cuenta, eliminamos tu perfil, fotos, conversaciones y demás datos asociados.
        </Section>

        <Section title="7. Tus derechos">
          Puedes solicitar acceso a tus datos o la eliminación de tu cuenta en cualquier momento
          escribiendo a{" "}
          <a
            href="mailto:hola@recetariovital.app"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            hola@recetariovital.app
          </a>
          , o desde la sección Ajustes dentro de la app.
        </Section>

        <Section title="8. Cambios a esta política">
          Podemos actualizar esta política ocasionalmente. Los cambios importantes se notificarán
          dentro de la app.
        </Section>

        <Section title="9. Contacto">
          Para dudas sobre el manejo de tu información, escríbenos a{" "}
          <a
            href="mailto:hola@recetariovital.app"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            hola@recetariovital.app
          </a>
          .
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-base text-primary">{title}</h2>
      <div className="mt-1.5 text-muted-foreground">{children}</div>
    </section>
  );
}
