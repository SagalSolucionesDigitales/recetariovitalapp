import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireHotmartAccess } from "./hotmart.functions";
import { z } from "zod";
import {
  type CondicionSalud,
  condicionLabel,
  indicadorTexto,
  TIEMPO_OPCIONES,
  PERSONAS_OPCIONES,
  PRESUPUESTO_OPCIONES,
} from "./condiciones";

const FOCO_NUTRICIONAL: Record<CondicionSalud, string> = {
  prediabetes:
    "Prioriza alimentos de índice glucémico bajo, altos en fibra y proteína, y limita los carbohidratos refinados para estabilizar la glucosa.",
  cardiovascular:
    "Prioriza grasas saludables (aceite de oliva, aguacate, pescado, nueces), reduce sodio y grasas saturadas, e incluye fuentes de omega-3.",
  sindrome_metabolico:
    "Prioriza el control de porciones, reduce carbohidratos refinados y azúcares añadidos, y favorece alimentos ricos en fibra que mejoren la sensibilidad a la insulina.",
  control_peso:
    "Prioriza la saciedad con fibra y proteína magra, cuida la densidad calórica y el tamaño de las porciones sin sacrificar el sabor.",
};

// Google Gemini's OpenAI-compatible endpoint — same request/response shape
// as the Lovable AI Gateway this replaces, just pointed at Google directly.
const GATEWAY = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-3.6-flash";

async function callAI(
  messages: Array<{ role: string; content: string }>,
  opts?: { json?: boolean },
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no está configurado.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("[ai.callAI] Gemini error", { status: res.status, body: txt.slice(0, 1000) });
    if (res.status === 429) throw new Error("Demasiadas solicitudes. Inténtalo en un momento.");
    if (res.status === 403)
      throw new Error("Sin créditos o permisos en la API de Gemini. Contacta a soporte.");
    throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content as string;
}

function describePerfil(p: {
  condicion_salud: string | null;
  glucosa_referencia: string | null;
  colesterol_nivel: string | null;
  circunferencia_cintura: string | null;
  peso_kg: number | null;
  estatura_cm: number | null;
  restricciones: string[] | null;
  tiempo_cocina: string | null;
  personas: string | null;
  presupuesto: string | null;
}) {
  return [
    `Condición de salud principal: ${condicionLabel(p.condicion_salud)}`,
    indicadorTexto(p),
    `Restricciones: ${(p.restricciones ?? []).filter((r) => r !== "ninguno").join(", ") || "ninguna"}`,
    `Tiempo de cocina: ${TIEMPO_OPCIONES.find((o) => o.id === p.tiempo_cocina)?.label ?? "sin dato"}`,
    `Personas en casa: ${PERSONAS_OPCIONES.find((o) => o.id === p.personas)?.label ?? "sin dato"}`,
    `Presupuesto: ${PRESUPUESTO_OPCIONES.find((o) => o.id === p.presupuesto)?.label ?? "sin dato"}`,
  ].join(". ");
}

export const generateWeeklyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    await requireHotmartAccess((claims as { email?: string } | undefined)?.email);
    const { data: perfil } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!perfil) throw new Error("Perfil no encontrado");

    const { data: checkins } = await supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", userId)
      .order("fecha", { ascending: false })
      .limit(5);

    const ctx = describePerfil(perfil);
    const checkinsTxt =
      (checkins ?? [])
        .map((c) => `${c.fecha}: bienestar ${c.bienestar_score}/5, plan ${c.siguio_plan}`)
        .join("; ") || "sin registros aún";

    const condicion = (perfil.condicion_salud ?? "prediabetes") as CondicionSalud;
    const system = `Eres Camila, coach de nutrición especializada en la Dieta Mediterránea adaptada con ingredientes mexicanos, para usuarios de México con ${condicionLabel(condicion)}. La Dieta Mediterránea (aceite de oliva, vegetales, legumbres, pescado, granos integrales, frutos secos) está científicamente validada para diabetes tipo 2, enfermedades cardiovasculares, síndrome metabólico y control de peso; adáptala con ingredientes mexicanos accesibles (nopal, aguacate, frijol, jitomate, chile, pescado, aceite de oliva o de canola). ${FOCO_NUTRICIONAL[condicion]} Respondes SIEMPRE en español neutro con tuteo (tú, te, tu) — nunca uses voseo. Devuelves EXCLUSIVAMENTE un objeto JSON válido con esta estructura exacta: { "semana": "string", "dias": [{ "dia": "Lunes"|"Martes"|"Miércoles"|"Jueves"|"Viernes"|"Sábado"|"Domingo", "desayuno": Comida, "almuerzo": Comida, "cena": Comida }] } donde Comida = { "nombre": string, "por_que_es_buena": string (1-2 oraciones, enfocadas en ${condicionLabel(condicion)}), "ingredientes": string[], "pasos": string[], "ig_nivel": "Bajo"|"Medio", "costo_usd": number }. Genera EXACTAMENTE 7 días × 3 comidas = 21 comidas. NO incluyas explicaciones fuera del JSON.`;

    const user = `Perfil: ${ctx}. Últimos check-ins: ${checkinsTxt}. Genera un plan semanal personalizado.`;

    const content = await callAI(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { json: true },
    );

    let plan: Record<string, unknown>;
    try {
      plan = JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new Error("La IA no devolvió JSON válido.");
    }

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
    const { data } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", userId)
      .order("generado_en", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });

export const askCamila = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ mensaje: z.string().trim().min(1).max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    await requireHotmartAccess((claims as { email?: string } | undefined)?.email);
    const [{ data: perfil }, { data: checkins }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", userId)
        .order("fecha", { ascending: false })
        .limit(5),
      supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .order("fecha", { ascending: false })
        .limit(10),
    ]);

    const ctx = perfil ? describePerfil(perfil) : "sin perfil";
    const checkinsTxt =
      (checkins ?? []).map((c) => `${c.fecha}: bienestar ${c.bienestar_score}/5`).join("; ") ||
      "sin registros";

    const condicion = (perfil?.condicion_salud ?? "prediabetes") as CondicionSalud;
    const system = `Eres Camila, coach de nutrición especializada en la Dieta Mediterránea adaptada con ingredientes mexicanos, para usuarios de México con ${condicionLabel(condicion)}. ${FOCO_NUTRICIONAL[condicion]} Respondes en español neutro con tuteo (tú, te, tu) — NUNCA voseo. Tono cercano, empático, sin condescendencia. NO diagnosticas ni prescribes medicamentos. Limita tus respuestas a 3–4 oraciones. Contexto del usuario — ${ctx}. Check-ins recientes — ${checkinsTxt}.`;

    const historyMsgs = (history ?? []).reverse().flatMap((h) => [
      { role: "user", content: h.mensaje },
      { role: "assistant", content: h.respuesta },
    ]);

    const respuesta = await callAI([
      { role: "system", content: system },
      ...historyMsgs,
      { role: "user", content: data.mensaje },
    ]);

    const { error } = await supabase.from("conversations").insert({
      user_id: userId,
      mensaje: data.mensaje,
      respuesta,
    });
    if (error) throw new Error(error.message);
    return { respuesta };
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("fecha", { ascending: true })
      .limit(50);
    return data ?? [];
  });
