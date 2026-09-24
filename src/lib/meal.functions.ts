import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireHotmartAccess } from "./hotmart.functions";
import { callAI } from "./ai.functions";
import { z } from "zod";
import { type CondicionSalud, condicionLabel, paisLabel } from "./condiciones";

export type AnalisisPlato = {
  nombre_plato: string;
  porcion_estimada: string;
  calorias_kcal: number;
  carbohidratos_g: number;
  azucares_g: number;
  proteina_g: number;
  grasa_g: number;
  grasa_saturada_g: number;
  fibra_g: number;
  sodio_mg: number;
  indice_glucemico: "Bajo" | "Medio" | "Alto";
  semaforo: "verde" | "amarillo" | "rojo";
  evaluacion: string;
  sugerencia: string;
};

const FOCO_ANALISIS: Record<CondicionSalud, string> = {
  prediabetes:
    "el impacto en la glucosa: carbohidratos totales, azúcares y el índice glucémico estimado del plato.",
  cardiovascular:
    "el impacto cardiovascular: grasas saturadas, sodio y colesterol estimado del plato.",
  sindrome_metabolico:
    "el tamaño de la porción, carbohidratos refinados y azúcares añadidos del plato.",
  control_peso: "la densidad calórica y el tamaño de la porción respecto a una porción saludable.",
};

const ANALYSIS_PROMPT_INTRO = (pais: string, condicion: CondicionSalud) =>
  `Eres Camila, coach de nutrición. Analiza la foto de este plato de comida para un usuario de ${pais} con ${condicionLabel(condicion)}. Estima visualmente la porción y el contenido nutricional — deja claro que es una ESTIMACIÓN visual, no una medición exacta de laboratorio. Presta especial atención a ${FOCO_ANALISIS[condicion]} Usa el nombre local de los ingredientes en ${pais}. Devuelve EXCLUSIVAMENTE un objeto JSON con esta estructura exacta: { "nombre_plato": string, "porcion_estimada": string (ej. "1 plato mediano, ~350 g"), "calorias_kcal": number, "carbohidratos_g": number, "azucares_g": number, "proteina_g": number, "grasa_g": number, "grasa_saturada_g": number, "fibra_g": number, "sodio_mg": number, "indice_glucemico": "Bajo"|"Medio"|"Alto", "semaforo": "verde"|"amarillo"|"rojo" (verde = adecuado para su condición, amarillo = moderar, rojo = evitar o reducir mucho la porción), "evaluacion": string (2-3 oraciones explicando el semáforo en relación a su condición), "sugerencia": string (un consejo concreto y accionable) }. NO incluyas explicaciones fuera del JSON. Si la imagen no muestra comida reconocible, responde con nombre_plato "No se pudo identificar el plato" y los demás campos numéricos en 0, semaforo "amarillo" y evaluacion explicando que no se reconoció comida en la foto.`;

export const analyzeMealPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().min(1).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    await requireHotmartAccess((claims as { email?: string } | undefined)?.email);

    if (!data.path.startsWith(`${userId}/`)) {
      throw new Error("Ruta de foto inválida.");
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from("meal-photos")
      .download(data.path);
    if (downloadError || !file) {
      throw new Error("No pudimos leer la foto. Intenta subirla de nuevo.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const { data: perfil } = await supabase
      .from("profiles")
      .select("condicion_salud, pais")
      .eq("id", userId)
      .maybeSingle();

    const condicion = (perfil?.condicion_salud ?? "prediabetes") as CondicionSalud;
    const pais = paisLabel(perfil?.pais);

    const content = await callAI(
      [
        {
          role: "user",
          content: [
            { type: "text", text: ANALYSIS_PROMPT_INTRO(pais, condicion) },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
      { json: true, label: "analisis-plato" },
    );

    let resultado: Record<string, unknown>;
    try {
      resultado = JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new Error("La IA no devolvió un análisis válido. Intenta con otra foto.");
    }

    const { data: inserted, error: insertError } = await supabase
      .from("meal_analyses")
      .insert({ user_id: userId, foto_path: data.path, resultado_json: resultado as never })
      .select("*")
      .single();
    if (insertError) throw new Error(insertError.message);

    return inserted;
  });

export const getMealAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("meal_analyses")
      .select("*")
      .eq("user_id", userId)
      .order("creado_en", { ascending: false })
      .limit(30);

    const rows = data ?? [];
    const withUrls = await Promise.all(
      rows.map(async (row) => {
        const { data: signed } = await supabase.storage
          .from("meal-photos")
          .createSignedUrl(row.foto_path, 3600);
        return { ...row, foto_url: signed?.signedUrl ?? null };
      }),
    );
    return withUrls;
  });

export const deleteMealAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), foto_path: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.storage.from("meal-photos").remove([data.foto_path]);
    const { error } = await supabase
      .from("meal_analyses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
