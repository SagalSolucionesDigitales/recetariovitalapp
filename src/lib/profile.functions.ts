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
  glucosa_referencia: z.enum(["100-110", "111-125", "no-se"]),
  restricciones: z.array(z.string()).max(10),
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
        glucosa_referencia: data.glucosa_referencia,
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
  .inputValidator((input) => z.object({
    nombre: z.string().trim().min(1).max(80).optional(),
    glucosa_referencia: z.enum(["100-110", "111-125", "no-se"]).optional(),
    tiempo_cocina: z.enum(["menos15", "15-30", "mas30"]).optional(),
    personas: z.enum(["1", "2", "3+"]).optional(),
    presupuesto: z.enum(["menos500", "500-1000", "mas1000"]).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ ...data, actualizado_en: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
