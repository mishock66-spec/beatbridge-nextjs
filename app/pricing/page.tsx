"use client";

import { useState } from "react";
import Link from "next/link";

// TODO: Enable when ready to launch — currently showing waitlist CTA instead of Stripe checkout

type BillingPeriod = "monthly" | "annual";

const PLANS = [
  {
    id: "free",
    name: "Free",
    badge: null,
    features: [
      "Access to all artist networks",
      "Contact browsing",
      "Manual DM tracking",
      "Daily DM counter",
      "Community leaderboard",
    ],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    badge: "MOST POPULAR",
    features: [
      "Everything in Free",
      "AI DM generation (top 50 contacts)",
      "Auto-generate on profile save",
      "Response probability scoring",
      "Priority contact badges",
    ],
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    badge: null,
    features: [
      "Everything in Pro",
      "AI DM generation for ALL contacts",
      "Mutual contacts insights",
      "Early access to new features",
    ],
    highlighted: false,
  },
  {
    id: "lifetime",
    name: "Lifetime",
    badge: "BEST VALUE",
    features: [
      "Everything in Premium",
      "Lifetime access — no subscription",
      "All future features included",
    ],
    highlighted: false,
  },
] as const;

function getPrice(id: string, period: BillingPeriod): { main: string; sub: string | null } {
  if (id === "free") return { main: "$0", sub: "/month" };
  if (id === "pro")
    return period === "monthly"
      ? { main: "$17", sub: "/month" }
      : { main: "$163", sub: "/year · $13.6/mo" };
  if (id === "premium")
    return period === "monthly"
      ? { main: "$32", sub: "/month" }
      : { main: "$307", sub: "/year · $25.6/mo" };
  return { main: "$330", sub: "one-time" };
}

function getDescription(id: string): string {
  if (id === "free") return "Start building your network today.";
  if (id === "pro") return "For beatmakers serious about placement.";
  if (id === "premium") return "Full access to every tool on BeatBridge.";
  return "Pay once, use forever.";
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-16 pb-24">

        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 text-orange-400 text-xs font-semibold uppercase tracking-[0.08em] mb-5">
            Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-light tracking-[0.02em] mb-4">
            Simple,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
              transparent
            </span>{" "}
            pricing
          </h1>
          <p className="text-[#a0a0a0] text-lg max-w-xl mx-auto">
            Start free. Upgrade when you&apos;re ready to scale your outreach with AI.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 mt-8 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
            <button
              onClick={() => setPeriod("monthly")}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                period === "monthly"
                  ? "bg-white/[0.08] text-white"
                  : "text-[#606060] hover:text-[#a0a0a0]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod("annual")}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                period === "annual"
                  ? "bg-white/[0.08] text-white"
                  : "text-[#606060] hover:text-[#a0a0a0]"
              }`}
            >
              Annual
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {PLANS.map((plan) => {
            const { main, sub } = getPrice(plan.id, period);
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-6 ${
                  plan.highlighted
                    ? "bg-white/[0.04] border-2 border-orange-500/60 shadow-[0_0_30px_rgba(249,115,22,0.12)]"
                    : "bg-white/[0.025] border border-white/[0.08]"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-orange-500 text-white uppercase tracking-wider whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <p className="text-xs font-bold text-[#505050] uppercase tracking-[0.1em] mb-3">
                  {plan.name}
                </p>

                {/* Price */}
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{main}</span>
                  {sub && <span className="text-[#606060] text-sm">{sub}</span>}
                </div>

                <p className="text-xs text-[#606060] mt-1 mb-6 leading-relaxed min-h-[2.5rem]">
                  {getDescription(plan.id)}
                </p>

                {/* CTA */}
                {plan.id === "free" ? (
                  <Link
                    href="/artists"
                    className="w-full text-center text-sm font-semibold py-2.5 px-4 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1] transition-colors mb-7 block"
                  >
                    Get started free
                  </Link>
                ) : (
                  // TODO: Enable when ready to launch — replace anchor with Stripe checkout redirect
                  <Link
                    href="/#waitlist"
                    className={`w-full text-center text-sm font-semibold py-2.5 px-4 rounded-lg transition-all mb-7 block ${
                      plan.highlighted
                        ? "bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white hover:opacity-90"
                        : "bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1]"
                    }`}
                  >
                    Coming soon — join the waitlist
                  </Link>
                )}

                {/* Features */}
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckIcon />
                      <span className="text-sm text-[#a0a0a0] leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[#404040] mt-12">
          14-day free trial on Pro and Premium — no credit card required to start. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
