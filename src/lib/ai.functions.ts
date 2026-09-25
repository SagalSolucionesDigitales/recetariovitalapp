import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireHotmartAccess } from "./hotmart.functions";
import { z } from "zod";
import {
  type CondicionSalud,
  condicionLabel,
  indicadorTexto,
  paisLabel,
  TIEMPO_OPCIONES,
  PERSONAS_OPCIONES,
  presupuestoOpciones,
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

const FOCO_POSTRE: Record<CondicionSalud, string> = {
  prediabetes:
    "índice glucémico bajo: fruta entera, yogur natural sin azúcar, cacao/chocolate oscuro >70%, canela, endulzantes naturales sin impacto glucémico (stevia, eritritol) — nunca azúcar refinada ni jarabes.",
  cardiovascular:
    "bajos en grasas saturadas y sin grasas trans: fruta, yogur bajo en grasa, frutos secos con moderación, cacao oscuro — evita repostería con mantequilla o crema en exceso.",
  sindrome_metabolico:
    "porciones pequeñas y bajos en azúcares añadidos: fruta con proteína (yogur, chía), gelatinas naturales, evitando picos de glucosa.",
  control_peso:
    "baja densidad calórica y porción controlada: fruta, paletas caseras, yogur natural — que sacien sin exceso de calorías.",
};

// Google Gemini's OpenAI-compatible endpoint — same request/response shape
// as the Lovable AI Gateway this replaces, just pointed at Google directly.
const GATEWAY = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-3.6-flash";

export type AIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type AIMessage = { role: string; content: string | AIContentPart[] };

// Gemini answers 503 ("high demand") and 429 in bursts; retrying after a pause
// usually gets through, so users don't see a transient overload. When
// the primary model stays overloaded (it has lasted minutes at a time), the
// call falls back to a second model before giving up.
const RETRYABLE_STATUS = new Set([429, 503]);
const PRIMARY_ATTEMPTS = 3;
const FALLBACK_ATTEMPTS = 2;
// Waits between attempts of the same model. The overload spikes outlast 1-2 s
// (the old backoff), so the gaps are long enough for a spike to pass while
// the whole call stays well inside the Vercel function limit.
const RETRY_DELAYS_MS = [5000, 15000];
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.8-flash";

// Every failed attempt is stored in public.ai_errors (Vercel Hobby logs only
// keep 1 hour). Never lets a logging problem break the AI call itself.
async function logAIError(row: {
  label: string;
  model: string;
  attempt: number;
  status: number | null;
  message: string;
  gave_up: boolean;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ai_errors").insert(row);
    if (error) console.error("[ai.callAI] could not record error", error);
  } catch (err) {
    console.error("[ai.callAI] could not record error", err);
  }
}

export async function callAI(messages: AIMessage[], opts?: { json?: boolean; label?: string }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no está configurado.");
  const label = opts?.label ?? "desconocido";
  const plan = [
    { model: MODEL, attempts: PRIMARY_ATTEMPTS },
    ...(FALLBACK_MODEL && FALLBACK_MODEL !== MODEL
      ? [{ model: FALLBACK_MODEL, attempts: FALLBACK_ATTEMPTS }]
      : []),
  ];
  let lastStatus = 0;
  let lastText = "";
  for (const { model, attempts } of plan) {
    const body = JSON.stringify({
      model,
      messages,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    });
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const res = await fetch(GATEWAY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body,
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content as string;
      }
      const txt = await res.text();
      // A broken fallback (e.g. model unavailable) must not mask the primary's
      // error: the user should still see the friendly "mucha demanda" message.
      if (model === MODEL || RETRYABLE_STATUS.has(res.status)) {
        lastStatus = res.status;
        lastText = txt;
      }
      console.error("[ai.callAI] Gemini error", {
        label,
        model,
        status: res.status,
        attempt,
        body: txt.slice(0, 1000),
      });
      const retryable = RETRYABLE_STATUS.has(res.status);
      const lastOfAll = model === plan[plan.length - 1].model && attempt === attempts;
      await logAIError({
        label,
        model,
        attempt,
        status: res.status,
        message: txt.slice(0, 500),
        gave_up: !retryable || lastOfAll,
      });
      // Non-transient errors (403, 400...) won't improve with another model.
      if (!retryable) break;
      if (attempt < attempts) {
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length) - 1];
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    if (!RETRYABLE_STATUS.has(lastStatus)) break;
  }
  if (lastStatus === 429) throw new Error("Demasiadas solicitudes. Inténtalo en un momento.");
  if (lastStatus === 503)
    throw new Error("Camila tiene mucha demanda ahora mismo. Inténtalo de nuevo en unos segundos.");
  if (lastStatus === 403)
    throw new Error("Sin créditos o permisos en la API de Gemini. Contacta a soporte.");
  throw new Error(`AI error ${lastStatus}: ${lastText.slice(0, 200)}`);
}

function describePerfil(p: {
  pais: string | null;
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
    `País: ${paisLabel(p.pais)}`,
    `Condición de salud principal: ${condicionLabel(p.condicion_salud)}`,
    indicadorTexto(p),
    `Restricciones: ${(p.restricciones ?? []).filter((r) => r !== "ninguno").join(", ") || "ninguna"}`,
    `Tiempo de cocina: ${TIEMPO_OPCIONES.find((o) => o.id === p.tiempo_cocina)?.label ?? "sin dato"}`,
    `Personas en casa: ${PERSONAS_OPCIONES.find((o) => o.id === p.personas)?.label ?? "sin dato"}`,
    `Presupuesto: ${presupuestoOpciones(p.pais).find((o) => o.id === p.presupuesto)?.label ?? "sin dato"}`,
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
    const pais = paisLabel(perfil.pais);
    const system = `Eres Camila, coach de nutrición especializada en alimentación saludable adaptada a ${pais}, para usuarios de ${pais} con ${condicionLabel(condicion)}. Un patrón de alimentación basado en aceite de oliva, vegetales, legumbres, pescado, granos integrales y frutos secos está científicamente validado para diabetes tipo 2, enfermedades cardiovasculares, síndrome metabólico y control de peso; adáptalo con ingredientes accesibles en los mercados y supermercados de ${pais}. Usa SIEMPRE el nombre que cada ingrediente recibe en ${pais}, no el de otro país (ejemplos de cómo cambia según el país: "guisantes" en España/México es "arvejas" en Colombia/Argentina/Chile/Perú/Bolivia y "chícharos" en México; "aguacate" en México/España es "palta" en Argentina/Chile/Perú/Uruguay/Bolivia/Ecuador; "frijol"/"frijoles" en México es "judía"/"alubia" en España, "poroto" en Argentina/Chile/Bolivia, y "caraota" en Venezuela; "papaya" en México es "lechosa" en Venezuela y "fruta bomba" en otros países caribeños; "elote"/"maíz" en México es "choclo" en Sudamérica; "durazno" es "melocotón" en España; "camarón" es "gamba" en España; "cacahuate" en México es "maní" en el resto de Latam y "cacahuete" en España) — ajusta cualquier otro ingrediente siguiendo la misma lógica según ${pais}. ${FOCO_NUTRICIONAL[condicion]} Además, cada día incluye un POSTRE diseñado para que la persona pueda disfrutar de algo dulce SIN que afecte negativamente su condición — este es uno de los ganchos principales de la app: "postres que puedes disfrutar sin culpa". Para el postre, usa ingredientes ${FOCO_POSTRE[condicion]} El postre debe ser real y apetitoso (no una fruta pelada sin más), con nombre atractivo, y su "por_que_es_buena" debe explicar por qué NO sube la glucosa / no perjudica su condición pese a ser un postre. Respondes SIEMPRE en español neutro con tuteo (tú, te, tu) — nunca uses voseo. Devuelves EXCLUSIVAMENTE un objeto JSON válido con esta estructura exacta: { "semana": "string", "dias": [{ "dia": "Lunes"|"Martes"|"Miércoles"|"Jueves"|"Viernes"|"Sábado"|"Domingo", "desayuno": Comida, "almuerzo": Comida, "cena": Comida, "postre": Comida }] } donde Comida = { "nombre": string, "por_que_es_buena": string (1-2 oraciones, enfocadas en ${condicionLabel(condicion)}), "ingredientes": string[], "pasos": string[], "ig_nivel": "Bajo"|"Medio", "costo_usd": number }. Genera EXACTAMENTE 7 días × 4 comidas (desayuno, almuerzo, cena y postre) = 28 comidas. NO incluyas explicaciones fuera del JSON.`;

    const user = `Perfil: ${ctx}. Últimos check-ins: ${checkinsTxt}. Genera un plan semanal personalizado.`;

    const content = await callAI(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { json: true, label: "plan-semanal" },
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
    const pais = paisLabel(perfil?.pais);
    const system = `Eres Camila, coach de nutrición especializada en alimentación saludable adaptada a ${pais}, para usuarios de ${pais} con ${condicionLabel(condicion)}. Cuando menciones ingredientes, usa siempre el nombre que reciben en ${pais} (por ejemplo: "guisantes" es "arvejas" en Colombia/Argentina/Chile/Perú y "chícharos" en México; "aguacate" es "palta" en el Cono Sur; "frijoles" es "judías"/"alubias" en España y "porotos" en el Cono Sur), no el de otro país. ${FOCO_NUTRICIONAL[condicion]} Respondes en español neutro con tuteo (tú, te, tu) — NUNCA voseo. Tono cercano, empático, sin condescendencia. NO diagnosticas ni prescribes medicamentos. Limita tus respuestas a 3–4 oraciones. Contexto del usuario — ${ctx}. Check-ins recientes — ${checkinsTxt}.`;

    const historyMsgs = (history ?? []).reverse().flatMap((h) => [
      { role: "user", content: h.mensaje },
      { role: "assistant", content: h.respuesta },
    ]);

    const respuesta = await callAI([
      { role: "system", content: system },
      ...historyMsgs,
      { role: "user", content: data.mensaje },
    ], { label: "chat-camila" });

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
