"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface PreviewContact {
  username: string;
  fullName: string;
  followers: number;
  profileType: string;
}

interface PremiumGateClientProps {
  children: React.ReactNode;
  previewContacts: PreviewContact[];
  csvCount: number;
  artistSlug: string;
}

export default function PremiumGateClient({
  children,
  previewContacts,
  csvCount,
  artistSlug,
}: PremiumGateClientProps) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (checkedRef.current) return;
    checkedRef.current = true;

    fetch("/api/user/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    })
      .then((r) => r.json())
      .then((d) => setIsPremium(d.isPremium === true))
      .catch(() => setIsPremium(false));
  }, [isLoaded, isSignedIn, user?.id]);

  // Loading
  if (!isLoaded || isPremium === null) {
    return (
      <div className="min-h-[280px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Premium — full access
  if (isPremium) {
    return (
      <>
        {children}
        {/* CSV download for premium members */}
        <div className="mt-8 bg-white/[0.025] border border-orange-500/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white mb-0.5">Download full contact list</p>
            <p className="text-xs text-[#606060]">
              All {csvCount} Juke Wong contacts as CSV — ready to import.
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = `/api/export/${artistSlug}?userId=${user!.id}`;
            }}
            className="flex-shrink-0 text-sm font-semibold px-5 py-2.5 rounded-lg bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
          >
            Download CSV
          </button>
        </div>
      </>
    );
  }

  // Not premium — show blurred preview + upgrade gate
  return (
    <div className="relative">
      {/* Blurred preview cards */}
      <div
        className="space-y-3 select-none pointer-events-none"
        style={{ filter: "blur(5px)", opacity: 0.5 }}
        aria-hidden="true"
      >
        {previewContacts.map((c) => (
          <div
            key={c.username}
            className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">@{c.username}</p>
              <p className="text-xs text-[#606060]">{c.profileType}</p>
            </div>
            <span className="text-xs text-orange-500 font-medium flex-shrink-0">
              {c.followers.toLocaleString()} followers
            </span>
          </div>
        ))}
        {/* Extra phantom rows to hint at more content */}
        {[1, 2].map((i) => (
          <div
            key={`phantom-${i}`}
            className="bg-white/[0.015] border border-white/[0.04] rounded-2xl p-4 h-[62px]"
          />
        ))}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-8">
        <div
          className="bg-[#0f0f0f] border border-orange-500/30 rounded-2xl p-8 text-center max-w-md w-full"
          style={{ boxShadow: "0 0 40px rgba(249,115,22,0.08)" }}
        >
          <p className="text-3xl mb-3">🔒</p>
          <h3 className="text-lg font-medium text-white mb-2">Premium required</h3>
          <p className="text-sm text-[#a0a0a0] mb-6 leading-relaxed">
            This range is available on Premium — upgrade to access 10K+ contacts
            and download the full CSV.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
          >
            Upgrade to Premium →
          </Link>
        </div>
      </div>

      {/* CSV teaser below */}
      <div className="mt-[340px] bg-white/[0.025] border border-white/[0.08] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-[#a0a0a0] leading-relaxed">
          Premium members can download the full Juke Wong contact list as CSV —{" "}
          <span className="text-white font-medium">{csvCount} contacts</span> ready to import.
        </p>
        <button
          disabled
          className="flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#404040] cursor-not-allowed"
        >
          Download CSV
        </button>
      </div>
    </div>
  );
}
