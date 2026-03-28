"use client";

import { useState } from "react";

export default function ScoringDisclaimer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-xs text-[#606060] uppercase tracking-[0.1em] font-medium">
          How we rank contacts
        </span>
        <svg
          className={`w-4 h-4 text-[#505050] transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 text-[#707070] text-xs leading-relaxed space-y-2 border-t border-white/[0.04]">
          <p className="pt-3">
            <span className="text-[#909090] font-medium">Reply probability</span> is estimated based on follower count and contact availability — smaller accounts tend to read their DMs more.
          </p>
          <p>
            <span className="text-[#909090] font-medium">Contact priority</span> reflects how closely connected someone is to the artist&apos;s creative process.
          </p>
          <p className="text-[#505050] italic">
            These are estimates only. Any contact can lead to an opportunity. A &ldquo;lower&rdquo; score doesn&apos;t mean don&apos;t reach out — it means manage your expectations. Sometimes a random follow becomes your biggest connection.
          </p>
        </div>
      )}
    </div>
  );
}
