// Access gate for the Hotmart one-time-purchase model: a user only has
// access if their account email matches an approved Hotmart purchase.
// Client-side eligibility checks go through the `check_hotmart_access` /
// `has_hotmart_access` Postgres functions (see supabase/migrations); this
// module is for server-only helpers.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const HOTMART_EVENT_STATUS: Record<string, string> = {
  PURCHASE_APPROVED: "approved",
  PURCHASE_COMPLETE: "approved",
  PURCHASE_CANCELED: "canceled",
  PURCHASE_REFUNDED: "refunded",
  PURCHASE_CHARGEBACK: "chargeback",
  PURCHASE_PROTEST: "protested",
  PURCHASE_EXPIRED: "expired",
};

export function statusForHotmartEvent(event: string): string | null {
  return HOTMART_EVENT_STATUS[event] ?? null;
}

/** Server-only helper. Throws if the given email has no approved Hotmart purchase. */
export async function requireHotmartAccess(email: string | null | undefined) {
  if (!email) throw new Error("No se pudo verificar tu compra en Hotmart.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("hotmart_purchases")
    .select("id")
    .eq("email", normalizeEmail(email))
    .eq("status", "approved")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[hotmart.requireHotmartAccess] query error", error);
    throw new Error("No se pudo verificar tu compra en Hotmart.");
  }
  if (!data) {
    throw new Error(
      "Necesitas una compra aprobada en Hotmart con este correo para usar esta función.",
    );
  }
}
