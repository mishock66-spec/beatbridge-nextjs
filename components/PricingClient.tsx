"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

type Period = "monthly" | "annual";

const PRICE_IDS = {
  pro: {
    monthly: "price_1TIsEJFdAMtpz9xE1W9s1uZL",
    annual:  "price_1TIsENFdAMtpz9xE8jMbm2SI",
  },
  premium: {
    monthly: "price_1TIsEQFdAMtpz9xE4bpY1fSF",
    annual:  "price_1TIsEUFdAMtpz9xEBt0FCtlc",
  },
} as const;

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

export default function PricingClient({
  trialExpired,
  totalConnections,
}: {
  trialExpired: boolean;
  totalConnections: number;
}) {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("monthly");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dmsSent, setDmsSent] = useState<number>(0);

  // Fetch DMs sent count for post-trial banner
  useEffect(() => {
    if (!trialExpired || !isSignedIn || !user || !supabase) return;
    supabase
      .from("dm_activity")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", "sent")
      .then(({ count }) => {
        if (count !== null) setDmsSent(count);
      });
  }, [trialExpired, isSignedIn, user?.id]);

  const handleCheckout = async (planKey: "pro" | "premium") => {
    if (!isSignedIn || !user) {
      router.push("/sign-in?redirect_url=/pricing");
      return;
    }
    const priceId = PRICE_IDS[planKey][period];
    setLoadingId(priceId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          userEmail: user.primaryEmailAddress?.emailAddress,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Something went wrong. Please try again.");
        setLoadingId(null);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-4xl mx-auto px-4 py-16 pb-28">

        {/* Post-trial banner */}
        {trialExpired && (
          <div className="mb-10 bg-orange-500/[0.08] border border-orange-500/25 rounded-2xl px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-400 mb-1">
                  Your free trial has ended.
                </p>
                <p className="text-sm text-[#a0a0a0] leading-relaxed">
                  You had access to{" "}
                  <span className="text-white font-medium">
                    {totalConnections.toLocaleString()} contacts
                  </span>{" "}
                  and sent{" "}
                  <span className="text-white font-medium">{dmsSent} DMs</span>.
                  Keep your momentum going.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 text-orange-400 text-xs font-semibold uppercase tracking-[0.08em] mb-5">
            Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-light tracking-[0.02em] mb-4 text-white">
            Unlock every{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
              network
            </span>
          </h1>
          <p className="text-[#a0a0a0] text-lg max-w-lg mx-auto leading-relaxed">
            Start free for 14 days. No credit card required.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center mt-8 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 gap-1">
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
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">

          {/* Pro */}
          <div
            className="relative flex flex-col rounded-2xl p-7 bg-white/[0.04] transition-all duration-200"
            style={{ border: "2px solid #f97316", boxShadow: "0 0 32px rgba(249,115,22,0.12)" }}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
              <span className="text-[10px] font-bold px-3 py-1 rounded-full text-white uppercase tracking-wider whitespace-nowrap" style={{ background: "#f97316" }}>
                Most Popular
              </span>
            </div>

            <p className="text-[11px] font-bold text-[#505050] uppercase tracking-[0.12em] mb-3">Pro</p>

            <div className="mb-1 flex items-baseline gap-0.5">
              <span className="text-[2.5rem] font-black text-white leading-none">
                {period === "monthly" ? "$15" : "$144"}
              </span>
              <span className="text-[#606060] text-sm ml-0.5">
                {period === "monthly" ? "/month" : "/year"}
              </span>
            </div>
            <div className="h-4 mb-4">
              {period === "annual" && (
                <p className="text-xs text-[#505050]">$12/mo billed annually</p>
              )}
            </div>

            <p className="text-xs text-[#606060] mb-6 leading-relaxed">
              For beatmakers serious about placement.
            </p>

            <button
              onClick={() => handleCheckout("pro")}
              disabled={loadingId !== null}
              className="w-full text-center text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 mb-7 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #f97316, #f85c00)", color: "#fff" }}
            >
              {loadingId === PRICE_IDS.pro[period] ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Loading...
                </span>
              ) : (
                "Start free trial"
              )}
            </button>

            <ul className="space-y-3">
              {[
                "All artist networks (current + future)",
                "All DM templates",
                "Full dashboard + contact tracking",
                "14-day free trial, no credit card required",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check />
                  <span className="text-sm text-[#a0a0a0] leading-snug">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div className="relative flex flex-col rounded-2xl p-7 bg-white/[0.025] border border-white/[0.08] transition-all duration-200">
            <p className="text-[11px] font-bold text-[#505050] uppercase tracking-[0.12em] mb-3">Premium</p>

            <div className="mb-1 flex items-baseline gap-0.5">
              <span className="text-[2.5rem] font-black text-white leading-none">
                {period === "monthly" ? "$29" : "$278"}
              </span>
              <span className="text-[#606060] text-sm ml-0.5">
                {period === "monthly" ? "/month" : "/year"}
              </span>
            </div>
            <div className="h-4 mb-4">
              {period === "annual" && (
                <p className="text-xs text-[#505050]">$23/mo billed annually</p>
              )}
            </div>

            <p className="text-xs text-[#606060] mb-6 leading-relaxed">
              Full access to every tool on BeatBridge.
            </p>

            <button
              onClick={() => handleCheckout("premium")}
              disabled={loadingId !== null}
              className="w-full text-center text-sm font-semibold py-3 px-4 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] transition-all duration-200 mb-7 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingId === PRICE_IDS.premium[period] ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Loading...
                </span>
              ) : (
                "Start free trial"
              )}
            </button>

            <ul className="space-y-3">
              {[
                "Everything in Pro",
                "Access 10K+ follower contacts for all artists",
                "Download full CSV contact list per artist",
                "Access to unfiltered contacts (beyond curated list)",
                "14-day free trial, no credit card required",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check />
                  <span className="text-sm text-[#a0a0a0] leading-snug">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[#404040] mt-10">
          14-day free trial on all plans. No credit card required to start. Cancel anytime.
        </p>
        <p className="text-center text-xs text-[#303030] mt-3">
          BeatBridge stays paid to protect your access. Less users = less competition = more replies.
        </p>
      </div>
    </div>
  );
}
