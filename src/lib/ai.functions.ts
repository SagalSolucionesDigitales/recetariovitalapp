import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireActiveSubscription } from "./subscription.functions";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(messages: Array<{ role: string; content: string }>, opts?: { json?: boolean }) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY no está configurado.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("Demasiadas solicitudes. Inténtalo en un momento.");
    if (res.status === 402) throw new Error("Sin créditos disponibles. Contacta a soporte.");
    throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content as string;
}

function describePerfil(p: {
  glucosa_referencia: string | null;
  restricciones: string[] | null;
  tiempo_cocina: string | null;
  personas: string | null;
  presupuesto: string | null;
}) {
  const labels: Record<string, string> = {
    "100-110": "100–110 mg/dL (prediabetes leve)",
    "111-125": "111–125 mg/dL (prediabetes moderada)",
    "no-se": "no conoce con exactitud",
    menos15: "menos de 15 minutos",
    "15-30": "entre 15 y 30 minutos",
    mas30: "más de 30 minutos",
    "1": "1 persona",
    "2": "2 personas",
    "3+": "3 o más personas",
    menos500: "menos de $500 MXN/semana",
    "500-1000": "$500–$1,000 MXN/semana",
    mas1000: "más de $1,000 MXN/semana",
  };
  return [
    `Glucosa en ayunas: ${labels[p.glucosa_referencia ?? ""] ?? "sin dato"}`,
    `Restricciones: ${(p.restricciones ?? []).filter(r => r !== "ninguno").join(", ") || "ninguna"}`,
    `Tiempo de cocina: ${labels[p.tiempo_cocina ?? ""] ?? "sin dato"}`,
    `Personas en casa: ${labels[p.personas ?? ""] ?? "sin dato"}`,
    `Presupuesto: ${labels[p.presupuesto ?? ""] ?? "sin dato"}`,
  ].join(". ");
}

export const generateWeeklyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: perfil } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!perfil) throw new Error("Perfil no encontrado");

    const { data: checkins } = await supabase.from("check_ins")
      .select("*").eq("user_id", userId).order("fecha", { ascending: false }).limit(5);

    const ctx = describePerfil(perfil);
    const checkinsTxt = (checkins ?? []).map(c => `${c.fecha}: bienestar ${c.bienestar_score}/5, plan ${c.siguio_plan}`).join("; ") || "sin registros aún";

    const system = `Eres Camila, coach de nutrición especializada en prediabetes para usuarios latinoamericanos (México). Generas planes semanales de comidas con índice glucémico bajo, alto en fibra y proteína. Respondes SIEMPRE en español neutro con tuteo (tú, te, tu) — nunca uses voseo. Devuelves EXCLUSIVAMENTE un objeto JSON válido con esta estructura exacta: { "semana": "string", "dias": [{ "dia": "Lunes"|"Martes"|"Miércoles"|"Jueves"|"Viernes"|"Sábado"|"Domingo", "desayuno": Comida, "almuerzo": Comida, "cena": Comida }] } donde Comida = { "nombre": string, "por_que_es_buena": string (1-2 oraciones, enfocadas en prediabetes), "ingredientes": string[], "pasos": string[], "ig_nivel": "Bajo"|"Medio", "costo_usd": number }. Genera EXACTAMENTE 7 días × 3 comidas = 21 comidas. Usa ingredientes mexicanos accesibles. NO incluyas explicaciones fuera del JSON.`;

    const user = `Perfil: ${ctx}. Últimos check-ins: ${checkinsTxt}. Genera un plan semanal personalizado.`;

    const content = await callAI([
      { role: "system", content: system },
      { role: "user", content: user },
    ], { json: true });

    let plan: Record<string, unknown>;
    try { plan = JSON.parse(content) as Record<string, unknown>; } catch { throw new Error("La IA no devolvió JSON válido."); }

    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const semana_inicio = monday.toISOString().slice(0, 10);

    const { error } = await supabase.from("weekly_plans").insert({
      user_id: userId,
      semana_inicio,
      plan_json: plan as never,
    });
    if (error) throw new Error(error.message);
    return { semana_inicio };
  });

export const getLatestPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("weekly_plans")
      .select("*").eq("user_id", userId)
      .order("generado_en", { ascending: false }).limit(1).maybeSingle();
    return data;
  });

export const askCamila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ mensaje: z.string().trim().min(1).max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: perfil }, { data: checkins }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("check_ins").select("*").eq("user_id", userId).order("fecha", { ascending: false }).limit(5),
      supabase.from("conversations").select("*").eq("user_id", userId).order("fecha", { ascending: false }).limit(10),
    ]);

    const ctx = perfil ? describePerfil(perfil) : "sin perfil";
    const checkinsTxt = (checkins ?? []).map(c => `${c.fecha}: bienestar ${c.bienestar_score}/5`).join("; ") || "sin registros";

    const system = `Eres Camila, coach de nutrición especializada en prediabetes para usuarios mexicanos. Respondes en español neutro con tuteo (tú, te, tu) — NUNCA voseo. Tono cercano, empático, sin condescendencia. NO diagnosticas ni prescribes medicamentos. Cuando sea relevante menciona el índice glucémico. Limita tus respuestas a 3–4 oraciones. Contexto del usuario — ${ctx}. Check-ins recientes — ${checkinsTxt}.`;

    const historyMsgs = (history ?? []).reverse().flatMap(h => ([
      { role: "user", content: h.mensaje },
      { role: "assistant", content: h.respuesta },
    ]));

    const respuesta = await callAI([
      { role: "system", content: system },
      ...historyMsgs,
      { role: "user", content: data.mensaje },
    ]);

    const { error } = await supabase.from("conversations").insert({
      user_id: userId, mensaje: data.mensaje, respuesta,
    });
    if (error) throw new Error(error.message);
    return { respuesta };
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("conversations")
      .select("*").eq("user_id", userId).order("fecha", { ascending: true }).limit(50);
    return data ?? [];
  });
