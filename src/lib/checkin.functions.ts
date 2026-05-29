import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getRecentCheckins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("check_ins")
      .select("*").eq("user_id", userId)
      .order("fecha", { ascending: false }).limit(14);
    return data ?? [];
  });

export const saveCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    bienestar_score: z.number().int().min(1).max(5),
    siguio_plan: z.enum(["si", "parcial", "no"]),
    notas: z.string().trim().max(500).optional().nullable(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const fecha = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("check_ins").upsert({
      user_id: userId, fecha,
      bienestar_score: data.bienestar_score,
      siguio_plan: data.siguio_plan,
      notas: data.notas ?? null,
    }, { onConflict: "user_id,fecha" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
