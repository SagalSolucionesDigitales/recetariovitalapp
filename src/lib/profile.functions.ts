import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const OnboardingSchema = z.object({
  condicion_salud: z.enum(["prediabetes", "cardiovascular", "sindrome_metabolico", "control_peso"]),
  glucosa_referencia: z.enum(["100-110", "111-125", "no-se"]).nullable().optional(),
  colesterol_nivel: z.enum(["menos200", "200-239", "mas240", "no-se"]).nullable().optional(),
  circunferencia_cintura: z.enum(["menos80", "80-99", "mas100", "no-se"]).nullable().optional(),
  peso_kg: z.number().positive().max(400).nullable().optional(),
  estatura_cm: z.number().positive().max(260).nullable().optional(),
  restricciones: z.array(z.string().trim().min(1).max(60)).max(10),
  tiempo_cocina: z.enum(["menos15", "15-30", "mas30"]),
  personas: z.enum(["1", "2", "3+"]),
  presupuesto: z.enum(["menos500", "500-1000", "mas1000"]),
});

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => OnboardingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        condicion_salud: data.condicion_salud,
        glucosa_referencia: data.glucosa_referencia ?? null,
        colesterol_nivel: data.colesterol_nivel ?? null,
        circunferencia_cintura: data.circunferencia_cintura ?? null,
        peso_kg: data.peso_kg ?? null,
        estatura_cm: data.estatura_cm ?? null,
        restricciones: data.restricciones,
        tiempo_cocina: data.tiempo_cocina,
        personas: data.personas,
        presupuesto: data.presupuesto,
        onboarding_completo: true,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProfileBasics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        nombre: z.string().trim().min(1).max(80).optional(),
        condicion_salud: z
          .enum(["prediabetes", "cardiovascular", "sindrome_metabolico", "control_peso"])
          .optional(),
        glucosa_referencia: z.enum(["100-110", "111-125", "no-se"]).nullable().optional(),
        colesterol_nivel: z.enum(["menos200", "200-239", "mas240", "no-se"]).nullable().optional(),
        circunferencia_cintura: z
          .enum(["menos80", "80-99", "mas100", "no-se"])
          .nullable()
          .optional(),
        peso_kg: z.number().positive().max(400).nullable().optional(),
        estatura_cm: z.number().positive().max(260).nullable().optional(),
        restricciones: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
        tiempo_cocina: z.enum(["menos15", "15-30", "mas30"]).optional(),
        personas: z.enum(["1", "2", "3+"]).optional(),
        presupuesto: z.enum(["menos500", "500-1000", "mas1000"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ ...data, actualizado_en: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
