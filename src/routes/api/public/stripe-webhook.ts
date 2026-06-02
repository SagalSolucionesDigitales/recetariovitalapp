import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!sig || !whSecret || !stripeKey) {
          return new Response("Missing webhook config", { status: 400 });
        }

        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as never });
        const body = await request.text();

        let event: import("stripe").Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "invalid";
          return new Response(`Webhook Error: ${msg}`, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        async function upsertFromSubscription(sub: import("stripe").Stripe.Subscription) {
          const subAny = sub as unknown as Record<string, unknown>;
          const customerObj = sub.customer as unknown as { id?: string; metadata?: Record<string, string> } | string;
          const customerId = typeof customerObj === "string" ? customerObj : customerObj.id ?? "";
          const customerMeta = typeof customerObj === "string" ? undefined : customerObj.metadata;
          const userId =
            (sub.metadata?.user_id as string | undefined) ||
            (customerMeta?.user_id as string | undefined) ||
            null;
          if (!userId) {
            console.warn("[stripe-webhook] subscription without user_id metadata", sub.id);
            return;
          }
          const cpe = (subAny.current_period_end as number | undefined)
            ?? (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end;
          const periodEnd = cpe ? new Date(cpe * 1000).toISOString() : null;
          const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

          // Try update existing row by stripe_subscription_id
          const { data: existing } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("stripe_subscription_id", sub.id)
            .maybeSingle();

          const payload = {
            user_id: userId,
            status: sub.status,
            stripe_subscription_id: sub.id,
            stripe_customer_id: customerId,
            current_period_end: periodEnd,
            trial_end: trialEnd,
          };

          if (existing) {
            await supabaseAdmin.from("subscriptions").update(payload).eq("id", existing.id);
          } else {
            // Update the latest trialing row for this user if present, else insert
            const { data: latest } = await supabaseAdmin
              .from("subscriptions")
              .select("id")
              .eq("user_id", userId)
              .is("stripe_subscription_id", null)
              .order("creado_en", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latest) {
              await supabaseAdmin.from("subscriptions").update(payload).eq("id", latest.id);
            } else {
              await supabaseAdmin.from("subscriptions").insert(payload);
            }
          }
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as import("stripe").Stripe.Checkout.Session;
              if (session.subscription) {
                const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
                const sub = await stripe.subscriptions.retrieve(subId);
                if (!sub.metadata?.user_id && session.client_reference_id) {
                  sub.metadata = { ...(sub.metadata ?? {}), user_id: session.client_reference_id };
                }
                await upsertFromSubscription(sub);
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
            case "customer.subscription.trial_will_end": {
              const sub = event.data.object as import("stripe").Stripe.Subscription;
              await upsertFromSubscription(sub);
              break;
            }
            case "invoice.payment_failed": {
              const invoice = event.data.object as unknown as { subscription?: string | { id: string }; parent?: { subscription_details?: { subscription?: string | { id: string } } } };
              const rawSub = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
              const subId = typeof rawSub === "string" ? rawSub : rawSub?.id;
              if (subId) {
                const sub = await stripe.subscriptions.retrieve(subId);
                await upsertFromSubscription(sub);
              }
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook] handler error", err);
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
