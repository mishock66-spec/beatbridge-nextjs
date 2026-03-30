"use client";

// TODO: Enable when ready to launch — replace waitlist CTAs with Stripe checkout redirects

import { useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Period = "monthly" | "annual";

const PLANS = [
  {
    id: "free",
    name: "Free",
    badge: null,
    monthlyPrice: "$0",
    annualPrice: "$0",
    priceSuffix: (p: Period) => "/month",
    annualNote: null,
    description: "Start building your network today.",
    features: [
      "Access to all artist networks",
      "Contact browsing & filtering",
      "Manual DM status tracking",
      "Daily DM safety counter",
      "Community leaderboard",
    ],
    cta: "Get started free",
    ctaHref: "/artists",
    waitlist: false,
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    badge: "MOST POPULAR",
    monthlyPrice: "$17",
    annualPrice: "$163",
    priceSuffix: (p: Period) => (p === "monthly" ? "/month" : "/year"),
    annualNote: "$13.58/mo",
    description: "For beatmakers serious about placement.",
    features: [
      "Everything in Free",
      "AI DM generation (top 50 contacts)",
      "Auto-generate DMs on profile save",
      "Response probability scoring",
      "Priority contact badges",
    ],
    cta: "Coming soon — join the waitlist",
    ctaHref: "/#waitlist",
    waitlist: true,
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    badge: null,
    monthlyPrice: "$32",
    annualPrice: "$307",
    priceSuffix: (p: Period) => (p === "monthly" ? "/month" : "/year"),
    annualNote: "$25.58/mo",
    description: "Full access to every tool on BeatBridge.",
    features: [
      "Everything in Pro",
      "AI DM generation for ALL contacts",
      "Mutual contacts insights",
      "Early access to new features",
    ],
    cta: "Coming soon — join the waitlist",
    ctaHref: "/#waitlist",
    waitlist: true,
    highlighted: false,
  },
  {
    id: "lifetime",
    name: "Lifetime",
    badge: "BEST VALUE",
    monthlyPrice: "$330",
    annualPrice: "$330",
    priceSuffix: () => " one-time",
    annualNote: null,
    description: "Pay once, own it forever.",
    features: [
      "Everything in Premium",
      "Lifetime access — no subscription",
      "All future features included",
    ],
    cta: "Coming soon — join the waitlist",
    ctaHref: "/#waitlist",
    waitlist: true,
    highlighted: false,
  },
] as const;

function Check() {
  return (
    <svg
      className="w-[15px] h-[15px] text-orange-500 flex-shrink-0 mt-[2px]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  const [period, setPeriod] = useState<Period>("monthly");

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-6xl mx-auto px-4 py-16 pb-28">

        {/* ── Hero ── */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 text-orange-400 text-xs font-semibold uppercase tracking-[0.08em] mb-5">
            Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-light tracking-[0.02em] mb-4 text-white">
            Simple,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
              transparent
            </span>{" "}
            pricing
          </h1>
          <p className="text-[#a0a0a0] text-lg max-w-xl mx-auto leading-relaxed">
            Start free. Upgrade when you&apos;re ready to scale your outreach with AI.
          </p>

          {/* ── Billing toggle ── */}
          <div className="inline-flex items-center mt-9 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 gap-1">
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                period === "monthly"
                  ? "bg-white/[0.10] text-white shadow-sm"
                  : "text-[#606060] hover:text-[#a0a0a0]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod("annual")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                period === "annual"
                  ? "bg-white/[0.10] text-white shadow-sm"
                  : "text-[#606060] hover:text-[#a0a0a0]"
              }`}
            >
              Annual
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider leading-none">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* ── Plan cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {PLANS.map((plan) => {
            const price = period === "monthly" ? plan.monthlyPrice : plan.annualPrice;
            const suffix = plan.priceSuffix(period);
            const note = period === "annual" ? plan.annualNote : null;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-6 transition-all duration-200 ${
                  plan.highlighted
                    ? "bg-white/[0.04]"
                    : "bg-white/[0.025] border border-white/[0.08]"
                }`}
                style={
                  plan.highlighted
                    ? { border: "2px solid #f97316", boxShadow: "0 0 32px rgba(249,115,22,0.15)" }
                    : undefined
                }
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span
                      className="text-[10px] font-bold px-3 py-1 rounded-full text-white uppercase tracking-wider whitespace-nowrap"
                      style={{ background: "#f97316" }}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <p className="text-[11px] font-bold text-[#505050] uppercase tracking-[0.12em] mb-3">
                  {plan.name}
                </p>

                {/* Price */}
                <div className="mb-1 flex items-baseline gap-0.5">
                  <span className="text-[2.5rem] font-black text-white leading-none">{price}</span>
                  <span className="text-[#606060] text-sm ml-0.5">{suffix}</span>
                </div>

                {/* Annual monthly rate */}
                <div className="h-4 mb-3">
                  {note && (
                    <p className="text-xs text-[#505050]">{note} billed annually</p>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-[#606060] mb-6 leading-relaxed min-h-[2rem]">
                  {plan.description}
                </p>

                {/* CTA */}
                {!plan.waitlist ? (
                  <Link
                    href={plan.ctaHref}
                    className="w-full text-center text-sm font-semibold py-2.5 px-4 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] transition-colors mb-7 block"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  // TODO: Enable when ready to launch — replace with Stripe checkout redirect
                  <Link
                    href={plan.ctaHref}
                    className={`w-full text-center text-sm font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 mb-7 block hover:opacity-90 ${
                      plan.highlighted
                        ? "text-white"
                        : "bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12]"
                    }`}
                    style={
                      plan.highlighted
                        ? { background: "linear-gradient(135deg, #f97316, #f85c00)" }
                        : undefined
                    }
                  >
                    {plan.cta}
                  </Link>
                )}

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check />
                      <span className="text-sm text-[#a0a0a0] leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[#404040] mt-12">
          14-day free trial on Pro and Premium. No credit card required to start. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
