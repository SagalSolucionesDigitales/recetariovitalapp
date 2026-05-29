import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send, Info, Brain } from "lucide-react";
import { askCamila, getConversation } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/coach")({
  head: () => ({ meta: [{ title: "Camila — Coach" }] }),
  component: CoachPage,
});

const quick = [
  "¿Puedo comer arroz blanco?",
  "Tengo hambre a las 11pm",
  "¿Qué fruta puedo comer?",
  "¿Puedo tomar café?",
];

function CoachPage() {
  const qc = useQueryClient();
  const fetchConv = useServerFn(getConversation);
  const ask = useServerFn(askCamila);

  const { data: convo } = useQuery({ queryKey: ["conv"], queryFn: () => fetchConv() });
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const mut = useMutation({
    mutationFn: (mensaje: string) => ask({ data: { mensaje } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["conv"] }); setText(""); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No pudimos enviar el mensaje"),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [convo, mut.isPending]);

  function send(msg: string) {
    if (!msg.trim() || mut.isPending) return;
    mut.mutate(msg.trim());
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="bg-primary px-5 pb-4 pt-5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-white/15 font-serif text-lg">C</div>
          <div className="flex-1">
            <p className="font-serif text-lg leading-tight">Camila</p>
            <p className="text-[11px] text-white/65">Coach de nutrición · prediabetes</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-[oklch(0.78_0.16_150)]" />
        </div>
      </header>

      <div className="border-b border-border bg-card px-4 py-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preguntas rápidas</p>
        <div className="flex gap-2 overflow-x-auto">
          {quick.map(q => (
            <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:bg-primary-soft">
              {q}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-28">
        {/* Welcome */}
        <CamilaBubble first>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Brain className="h-3 w-3" /> Conozco tu historial
          </div>
          <p>Hola, soy Camila. Estoy aquí para resolver tus dudas de nutrición considerando tu perfil. Pregúntame lo que necesites.</p>
        </CamilaBubble>

        <div className="flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-xs text-foreground/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>Soy un asistente de nutrición basado en IA. <strong>No reemplazo la consulta médica profesional.</strong></span>
        </div>

        {(convo ?? []).map((m, idx) => (
          <div key={m.id} className="space-y-3">
            <UserBubble>{m.mensaje}</UserBubble>
            <CamilaBubble>{m.respuesta}</CamilaBubble>
            {(idx + 1) % 10 === 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-xs text-foreground/80">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Recuerda: este asistente no reemplaza la consulta médica profesional.</span>
              </div>
            )}
          </div>
        ))}

        {mut.isPending && (
          <CamilaBubble>
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0.15s" }} />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0.3s" }} />
            </span>
          </CamilaBubble>
        )}
      </div>

      <div className="fixed bottom-[68px] left-1/2 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-card p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); send(text); }}
          className="flex items-center gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe tu duda nutricional…"
            className="flex-1 rounded-full bg-background px-4 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={!text.trim() || mut.isPending}
            className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function CamilaBubble({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary font-serif text-xs text-white">C</div>
      <div className={`max-w-[80%] rounded-2xl rounded-tl-none border border-border bg-card px-3.5 py-2.5 text-sm ${first ? "" : ""}`}>
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-none bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
        {children}
      </div>
    </div>
  );
}
