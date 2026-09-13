import { createFileRoute } from "@tanstack/react-router";
import { normalizeEmail, statusForHotmartEvent } from "@/lib/hotmart.functions";

export const Route = createFileRoute("/api/public/hotmart-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedHottok = process.env.HOTMART_HOTTOK;
        if (!expectedHottok) {
          console.error("[hotmart-webhook] Missing HOTMART_HOTTOK env var");
          return new Response("Missing webhook config", { status: 400 });
        }

        // Hotmart sends the security token as a request header, not in the JSON body.
        const receivedHottok = request.headers.get("x-hotmart-hottok");
        if (receivedHottok !== expectedHottok) {
          console.warn("[hotmart-webhook] Invalid hottok");
          return new Response("Unauthorized", { status: 401 });
        }

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const event = typeof body.event === "string" ? body.event : "";
        const status = statusForHotmartEvent(event);
        if (!status) {
          // Unhandled event type (e.g. billet printed) — acknowledge so Hotmart doesn't retry.
          return new Response(JSON.stringify({ received: true, ignored: event }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data = body.data as Record<string, unknown> | undefined;
        const buyer = data?.buyer as Record<string, unknown> | undefined;
        const purchase = data?.purchase as Record<string, unknown> | undefined;
        const product = data?.product as Record<string, unknown> | undefined;

        const email = typeof buyer?.email === "string" ? buyer.email : undefined;
        const transaction =
          typeof purchase?.transaction === "string" ? purchase.transaction : undefined;

        if (!email || !transaction) {
          console.warn("[hotmart-webhook] Missing email or transaction", { event });
          return new Response("Missing email or transaction", { status: 400 });
        }

        const approvedDate =
          typeof purchase?.approved_date === "number" ? purchase.approved_date : undefined;
        const creationDate =
          typeof body.creation_date === "number" ? body.creation_date : undefined;
        const purchasedAtMs = approvedDate ?? creationDate;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("hotmart_purchases").upsert(
          {
            email: normalizeEmail(email),
            status,
            hotmart_transaction: transaction,
            product_id: product?.id != null ? String(product.id) : null,
            purchased_at: purchasedAtMs ? new Date(purchasedAtMs).toISOString() : null,
            payload: body as never,
            actualizado_en: new Date().toISOString(),
          },
          { onConflict: "hotmart_transaction" },
        );

        if (error) {
          console.error("[hotmart-webhook] upsert error", error);
          return new Response("handler error", { status: 500 });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
