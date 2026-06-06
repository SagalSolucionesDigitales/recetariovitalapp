import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";

export const STRIPE_PRICE_ID = "price_1TddthRRnD7pgbHtCokKB4F0";
const TRIAL_DAYS = 7;

function assertStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID || STRIPE_PRICE_ID;
  const diagnostics = {
    hasSecretKey: Boolean(secretKey),
    hasPriceId: Boolean(priceId),
    priceId,
    priceIdSource: process.env.STRIPE_PRICE_ID ? "env" : "code",
  };
  if (!secretKey || !priceId) {
    console.error("[stripe.checkout] Missing Stripe configuration", diagnostics);
    throw new Error(
      `Configuración de Stripe incompleta: STRIPE_SECRET_KEY=${diagnostics.hasSecretKey ? "ok" : "faltante"}, STRIPE_PRICE_ID=${diagnostics.hasPriceId ? "ok" : "faltante"}`,
    );
  }
  return { secretKey, priceId };
}

async function getStripe() {
  const Stripe = (await import("stripe")).default;
  const { secretKey } = assertStripeConfig();
  return new Stripe(secretKey, { apiVersion: "2025-08-27.basil" as never });
}

function getOrigin() {
  const fromHeader = getRequestHeader("origin") || getRequestHeader("referer");
  if (fromHeader) {
    try { return new URL(fromHeader).origin; } catch { /* ignore */ }
  }
  const host = getRequestHeader("host");
  const proto = getRequestHeader("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "https://app.local";
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { priceId } = assertStripeConfig();
      const { supabase, userId, claims } = context;
      const email = (claims as { email?: string } | undefined)?.email;
      const stripe = await getStripe();

      // Find existing customer
      let customerId: string | undefined;
      const { data: existingSub, error: existingSubError } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .not("stripe_customer_id", "is", null)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingSubError) throw new Error(existingSubError.message);

      if (existingSub?.stripe_customer_id) {
        customerId = existingSub.stripe_customer_id;
      } else if (email) {
        const found = await stripe.customers.list({ email, limit: 1 });
        if (found.data.length > 0) customerId = found.data[0].id;
      }

      const origin = getOrigin();
      console.info("[stripe.checkout] Creating checkout session", {
        userId,
        hasEmail: Boolean(email),
        hasCustomerId: Boolean(customerId),
        priceId,
      });
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        customer_email: customerId ? undefined : email,
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: TRIAL_DAYS,
          metadata: { user_id: userId },
        },
        metadata: { user_id: userId },
        success_url: `${origin}/suscripcion?status=success`,
        cancel_url: `${origin}/suscripcion?status=cancel`,
        allow_promotion_codes: true,
      });

      if (!session.url) throw new Error("Stripe no devolvió una URL de checkout.");
      return { url: session.url };
    } catch (error) {
      console.error("[stripe.checkout] Error creating checkout session", error);
      if (error instanceof Error && error.message.startsWith("Configuración de Stripe")) {
        throw error;
      }
      throw new Error("No se pudo iniciar el pago. Inténtalo de nuevo o contacta soporte.");
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabase, userId, claims } = context;
      const email = (claims as { email?: string } | undefined)?.email;
      const stripe = await getStripe();

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .not("stripe_customer_id", "is", null)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

      let customerId = sub?.stripe_customer_id as string | undefined;
      if (!customerId && email) {
        const found = await stripe.customers.list({ email, limit: 1 });
        customerId = found.data[0]?.id;
      }
      if (!customerId) throw new Error("No se encontró un cliente de Stripe para tu cuenta.");

      const origin = getOrigin();
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/suscripcion`,
      });
      return { url: portal.url };
    } catch (error) {
      console.error("[stripe.portal] Error creating portal session", error);
      if (error instanceof Error && (
        error.message.startsWith("Configuración de Stripe") ||
        error.message.startsWith("No se encontró un cliente")
      )) {
        throw error;
      }
      throw new Error("No se pudo abrir el portal de suscripción. Inténtalo de nuevo.");
    }
  });
