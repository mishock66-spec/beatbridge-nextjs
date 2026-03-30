import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export const PRICE_TO_PLAN: Record<string, "pro" | "premium" | "lifetime"> = {
  [process.env.STRIPE_PRICE_PRO_MONTHLY!]: "pro",
  [process.env.STRIPE_PRICE_PRO_ANNUAL!]: "pro",
  [process.env.STRIPE_PRICE_PREMIUM_MONTHLY!]: "premium",
  [process.env.STRIPE_PRICE_PREMIUM_ANNUAL!]: "premium",
  [process.env.STRIPE_PRICE_LIFETIME!]: "lifetime",
};

export const LIFETIME_PRICE_ID = process.env.STRIPE_PRICE_LIFETIME!;
