import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Canonical price → plan mapping
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TIsEJFdAMtpz9xE1W9s1uZL": "pro",     // Pro monthly
  "price_1TIsENFdAMtpz9xE8jMbm2SI": "pro",     // Pro annual
  "price_1TIsEQFdAMtpz9xE4bpY1fSF": "premium", // Premium monthly
  "price_1TIsEUFdAMtpz9xEBt0FCtlc": "premium", // Premium annual
};

export async function POST(req: Request) {
  try {
    const { userId, userEmail } = await req.json();

    if (!userId) {
      return NextResponse.json({ allowed: false, reason: "no_user" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from("user_profiles")
      .select("plan, subscription_status, trial_start, stripe_customer_id")
      .eq("user_id", userId)
      .single();

    // No profile yet — seed trial and allow
    if (error || !data) {
      await supabase.from("user_profiles").upsert(
        { user_id: userId, trial_start: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      return NextResponse.json({ allowed: true, reason: "trial", trialDaysLeft: 14 });
    }

    // 1. Check paid plan from Supabase
    const hasPaidPlanInDb =
      data.plan === "lifetime" ||
      (["pro", "premium"].includes(data.plan ?? "") &&
        ["active", "trialing"].includes(data.subscription_status ?? ""));

    if (hasPaidPlanInDb) {
      return NextResponse.json({ allowed: true, reason: "paid" });
    }

    // 2. Trial check from Supabase
    if (data.trial_start) {
      const trialEnd = new Date(data.trial_start).getTime() + 14 * 24 * 60 * 60 * 1000;
      const trialDaysLeft = Math.ceil((trialEnd - Date.now()) / (24 * 60 * 60 * 1000));
      if (Date.now() < trialEnd) {
        return NextResponse.json({ allowed: true, reason: "trial", trialDaysLeft });
      }
    }

    // 3. Stripe direct check — webhook failsafe
    // Supabase may be stale if the webhook missed an event.
    // Query Stripe by email and sync to Supabase if a paid subscription is found.
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && userEmail) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

        // Search by customer ID first (faster), fall back to email lookup
        const customerId = data.stripe_customer_id as string | null;
        let activeSub: Stripe.Subscription | undefined;
        let resolvedCustomerId: string | undefined;

        if (customerId) {
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: "all",
            limit: 5,
          });
          activeSub = subs.data.find(
            (s) => s.status === "active" || s.status === "trialing"
          );
          resolvedCustomerId = customerId;
        }

        if (!activeSub && userEmail) {
          const customers = await stripe.customers.list({
            email: userEmail.toLowerCase(),
            limit: 1,
          });
          if (customers.data.length > 0) {
            resolvedCustomerId = customers.data[0].id;
            const subs = await stripe.subscriptions.list({
              customer: resolvedCustomerId,
              status: "all",
              limit: 5,
            });
            activeSub = subs.data.find(
              (s) => s.status === "active" || s.status === "trialing"
            );
          }
        }

        if (activeSub && resolvedCustomerId) {
          const priceId = activeSub.items.data[0]?.price.id ?? "";
          const plan = PRICE_TO_PLAN[priceId] ?? "pro";

          // Sync to Supabase so future requests hit the DB path
          await supabase.from("user_profiles").upsert(
            {
              user_id: userId,
              plan,
              stripe_customer_id: resolvedCustomerId,
              subscription_status: activeSub.status,
            },
            { onConflict: "user_id" }
          );

          return NextResponse.json({ allowed: true, reason: "paid" });
        }
      } catch (stripeErr) {
        console.error("[access] Stripe fallback check failed:", stripeErr);
        // Don't block — fall through to trial_expired
      }
    }

    // Trial expired, no paid plan found anywhere
    return NextResponse.json({ allowed: false, reason: "trial_expired" });
  } catch {
    return NextResponse.json({ allowed: true, reason: "error" });
  }
}
