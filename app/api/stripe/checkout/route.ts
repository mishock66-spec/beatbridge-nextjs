import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Lazy initialization — env vars available at request time, not build time
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });

  try {
    const { priceId, userId, userEmail } = await req.json();

    if (!priceId || !userId) {
      return NextResponse.json({ error: "Missing priceId or userId" }, { status: 400 });
    }

    const lifetimePriceId = process.env.STRIPE_PRICE_LIFETIME;
    const isLifetime = priceId === lifetimePriceId;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://beatbridge.live";

    const session = await stripe.checkout.sessions.create({
      mode: isLifetime ? "payment" : "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(isLifetime
        ? {}
        : { subscription_data: { trial_period_days: 14 } }),
      success_url: `${siteUrl}/dashboard?success=true`,
      cancel_url: `${siteUrl}/pricing`,
      ...(userEmail ? { customer_email: userEmail } : {}),
      metadata: { userId, priceId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
