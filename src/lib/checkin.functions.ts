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
    // Día calendario del dispositivo del usuario (no el UTC del servidor).
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const utcHoy = new Date().toISOString().slice(0, 10);
    // Solo se acepta la fecha del cliente si está a ±1 día de la del servidor.
    const fecha =
      data.fecha && Math.abs(Date.parse(data.fecha) - Date.parse(utcHoy)) <= 86_400_000
        ? data.fecha
        : utcHoy;
    const { error } = await supabase.from("check_ins").upsert({
      user_id: userId, fecha,
      bienestar_score: data.bienestar_score,
      siguio_plan: data.siguio_plan,
      notas: data.notas ?? null,
    }, { onConflict: "user_id,fecha" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
