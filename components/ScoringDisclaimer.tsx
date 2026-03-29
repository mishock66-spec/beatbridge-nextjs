"use client";

import { useState } from "react";

export default function ScoringDisclaimer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors min-h-[44px]"
      >
        <span className="text-sm text-orange-400 font-medium flex items-center gap-2">
          ℹ️ How we rank contacts
        </span>
        <svg
          className={`w-4 h-4 text-orange-400/60 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.06]">
          <p className="text-xs text-orange-400/70 font-semibold uppercase tracking-[0.1em] pt-3 pb-2">
            How we rank contacts:
          </p>
          <div className="text-[#a0a0a0] text-sm leading-relaxed space-y-3">
            <p>
              <span className="text-white/80 font-medium">Reply probability</span> is estimated based on follower count and contact availability — smaller accounts tend to read their DMs more.{" "}
              <span className="text-white/80 font-medium">Contact priority</span> reflects how closely connected someone is to the artist&apos;s creative process.
            </p>
            <p className="text-[#707070] italic text-xs leading-relaxed">
              These are estimates only. Any contact can lead to an opportunity. A lower score doesn&apos;t mean don&apos;t reach out — it means manage your expectations. Sometimes a random follow becomes your biggest connection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
