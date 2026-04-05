"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LATEST_DROP } from "@/lib/announcements";

const DISMISS_KEY = `bb_drop_dismissed_${LATEST_DROP.slug}`;
const BANNER_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export default function NewDropBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!LATEST_DROP.active) return;

    const droppedAt = new Date(LATEST_DROP.droppedAt).getTime();
    const now = Date.now();
    if (now - droppedAt > BANNER_TTL_MS) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="relative z-40 bg-[#0f0a00] border-b border-orange-500/25">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
        {/* Pulse icon */}
        <span className="relative flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-30 animate-ping" />
          <span className="relative text-base leading-none">🔓</span>
        </span>

        <p className="flex-1 text-xs sm:text-sm text-[#d0d0d0] leading-snug">
          <span className="text-orange-400 font-semibold">New network unlocked — </span>
          {LATEST_DROP.artistName}&apos;s circle is live.{" "}
          <span className="text-[#707070]">
            {LATEST_DROP.connectionCount.toLocaleString()} connections mapped.
          </span>{" "}
          <Link
            href={`/artist/${LATEST_DROP.slug}`}
            className="text-orange-400 hover:text-orange-300 underline underline-offset-2 font-medium transition-colors"
          >
            Explore now →
          </Link>
        </p>

        <button
          onClick={dismiss}
          aria-label="Dismiss banner"
          className="flex-shrink-0 text-[#505050] hover:text-[#a0a0a0] transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
