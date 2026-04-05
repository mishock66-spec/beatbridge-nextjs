import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Lazy initialization — env vars available at request time, not build time
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const priceToPlan: Record<string, string> = {
    // Current price IDs
    "price_1TIsEJFdAMtpz9xE1W9s1uZL": "pro",      // Pro monthly
    "price_1TIsENFdAMtpz9xE8jMbm2SI": "pro",      // Pro annual
    "price_1TIsEQFdAMtpz9xE4bpY1fSF": "premium",  // Premium monthly
    "price_1TIsEUFdAMtpz9xEBt0FCtlc": "premium",  // Premium annual
    // Legacy price IDs (existing subscribers)
    [process.env.STRIPE_PRICE_PRO_MONTHLY ?? ""]: "pro",
    [process.env.STRIPE_PRICE_PRO_ANNUAL ?? ""]: "pro",
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? ""]: "premium",
    [process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? ""]: "premium",
    [process.env.STRIPE_PRICE_LIFETIME ?? ""]: "lifetime",
  };

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[stripe/webhook] Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[stripe/webhook] Signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const priceId = session.metadata?.priceId;
        const customerId = session.customer as string | null;

        if (!userId || !priceId) break;

        const plan = priceToPlan[priceId] ?? "free";
        const subscriptionStatus =
          session.mode === "payment" ? "active" : "trialing";

        await supabaseAdmin.from("user_profiles").upsert(
          {
            user_id: userId,
            plan,
            stripe_customer_id: customerId ?? null,
            subscription_status: subscriptionStatus,
          },
          { onConflict: "user_id" }
        );

        console.log(`[stripe/webhook] checkout.session.completed: userId=${userId} plan=${plan}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status = sub.status;

        await supabaseAdmin
          .from("user_profiles")
          .update({ subscription_status: status })
          .eq("stripe_customer_id", customerId);

        console.log(`[stripe/webhook] subscription.updated: customer=${customerId} status=${status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await supabaseAdmin
          .from("user_profiles")
          .update({ plan: "free", subscription_status: "canceled" })
          .eq("stripe_customer_id", customerId);

        console.log(`[stripe/webhook] subscription.deleted: customer=${customerId} → downgraded to free`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
