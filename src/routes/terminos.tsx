import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terminos")({
  head: () => ({ meta: [{ title: "Términos y condiciones — Recetario Vital" }] }),
  component: TerminosPage,
});

function TerminosPage() {
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
          <h1 className="font-serif text-lg">Términos y condiciones</h1>
          <span className="w-9" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-5 py-6 pb-16 text-sm leading-relaxed text-foreground">
        <p className="text-xs text-muted-foreground">
          Última actualización: 16 de septiembre de 2026
        </p>

        <Section title="1. Qué es Recetario Vital">
          Recetario Vital es una aplicación web de nutrición asistida por inteligencia artificial.
          Genera planes de alimentación semanales personalizados (alimentación adaptada a tu
          condición de salud y a tu país), permite conversar con "Camila" (un asistente de IA de nutrición), analizar fotos de
          tus platos para estimar porciones y valores nutricionales, y llevar un registro de tu
          bienestar y progreso.
        </Section>

        <Section title="2. No es un servicio médico">
          Recetario Vital no diagnostica enfermedades, no prescribe medicamentos ni reemplaza la
          consulta con un profesional de la salud. La información y las estimaciones que ofrece
          (incluyendo el análisis de fotos de platos) son orientativas y no deben usarse como único
          criterio para decisiones médicas. Si tienes una condición de salud, consulta siempre a tu
          médico antes de hacer cambios importantes en tu alimentación.
        </Section>

        <Section title="3. Acceso y pago">
          El acceso a Recetario Vital se obtiene mediante un pago único realizado en Hotmart. Para
          activar tu cuenta debes registrarte con el mismo correo electrónico utilizado en esa
          compra. El acceso es de por vida (no requiere pagos recurrentes) mientras la compra
          original permanezca vigente y no sea reembolsada o disputada; si Hotmart nos notifica un
          reembolso o contracargo, el acceso a la cuenta se revoca.
        </Section>

        <Section title="4. Uso aceptable">
          Te comprometes a usar la app de forma personal y no comercial, a no intentar vulnerar sus
          sistemas de acceso o seguridad, y a no compartir tu cuenta con personas que no hayan
          realizado la compra correspondiente.
        </Section>

        <Section title="5. Contenido generado por IA">
          Los planes de alimentación, respuestas de Camila y análisis de fotos son generados
          automáticamente por modelos de inteligencia artificial (actualmente Google Gemini) a
          partir de tu perfil. Pueden contener imprecisiones. Eres responsable de verificar que los
          ingredientes y recetas sugeridos sean adecuados para tus alergias, restricciones y
          condición particular.
        </Section>

        <Section title="6. Cancelación y eliminación de cuenta">
          Puedes solicitar la eliminación de tu cuenta y tus datos en cualquier momento desde
          Ajustes o escribiendo a hola@recetariovital.app.
        </Section>

        <Section title="7. Limitación de responsabilidad">
          Recetario Vital se ofrece "tal cual". En la máxima medida permitida por la ley, no
          garantizamos resultados específicos de salud, pérdida de peso u otros indicadores, ni
          somos responsables por decisiones tomadas exclusivamente con base en el contenido generado
          por la app.
        </Section>

        <Section title="8. Cambios a estos términos">
          Podemos actualizar estos términos ocasionalmente. Los cambios importantes se notificarán
          dentro de la app.
        </Section>

        <Section title="9. Contacto">
          Para dudas sobre estos términos, escríbenos a{" "}
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
      <p className="mt-1.5 text-muted-foreground">{children}</p>
    </section>
  );
}
