import Stripe from "stripe";

// Lazy factory — never instantiated at module level so build-time env vars aren't required
export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
  });
}

// Build price→plan map at call time, not module level
export function getPriceToPlan(): Record<string, "pro" | "premium" | "lifetime"> {
  return {
    [process.env.STRIPE_PRICE_PRO_MONTHLY ?? ""]: "pro",
    [process.env.STRIPE_PRICE_PRO_ANNUAL ?? ""]: "pro",
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? ""]: "premium",
    [process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? ""]: "premium",
    [process.env.STRIPE_PRICE_LIFETIME ?? ""]: "lifetime",
  };
}
