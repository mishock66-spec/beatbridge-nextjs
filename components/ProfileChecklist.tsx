"use client";

import { useState } from "react";
import { ChecklistContent } from "@/components/InstagramSafetyGuide";

export default function ProfileChecklist() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] overflow-hidden mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors min-h-[44px]"
      >
        <span className="text-sm text-orange-400 font-medium">✅ Instagram Profile Checklist</span>
        <svg
          className={`w-4 h-4 text-orange-400/60 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/[0.06]">
          <ChecklistContent />
        </div>
      )}
    </div>
  );
}
