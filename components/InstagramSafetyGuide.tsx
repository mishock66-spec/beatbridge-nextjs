"use client";

import { useState } from "react";

export default function InstagramSafetyGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors min-h-[44px]"
      >
        <span className="text-sm text-orange-400 font-medium">📋 Instagram DM Safety Guide</span>
        <svg
          className={`w-4 h-4 text-orange-400/60 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-5 border-t border-white/[0.06] text-sm text-[#a0a0a0] leading-relaxed">
          <p className="pt-4 pb-3 text-white/70 italic">Before you start reaching out, read this.</p>

          {/* Daily limits */}
          <Section title="YOUR DAILY LIMITS (based on account age)">
            <ul className="space-y-1">
              {[
                "New account (< 1 month): 20–30 DMs/day max",
                "Active account (1–6 months): 50–70 DMs/day max",
                "Established account (6+ months): 80–100 DMs/day max",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-orange-500/50 flex-shrink-0 mt-0.5">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Hourly limit */}
          <Section title="HOURLY LIMIT">
            <p>
              Never send more than <span className="text-white/70 font-medium">10–15 DMs per hour</span> — regardless of your account age.
            </p>
          </Section>

          {/* Golden rules */}
          <Section title="THE GOLDEN RULES">
            <ol className="space-y-3">
              {[
                {
                  title: "Space your DMs",
                  body: "Wait at least 30–60 minutes between each message. Sending 20 DMs in 5 minutes is the fastest way to get flagged.",
                },
                {
                  title: "Always personalize",
                  body: "Never copy-paste the exact same message to everyone. Instagram detects identical text patterns. Use BeatBridge's AI generator to vary your messages.",
                },
                {
                  title: "Engage normally between DMs",
                  body: "Like posts, watch stories, leave comments. Act like a real human, not a bot.",
                },
                {
                  title: "Use a personal account",
                  body: "DMs from personal accounts land in Primary inbox. Professional account DMs often go to General where notifications are off by default.",
                },
                {
                  title: "Never include a link in your first message",
                  body: "Links in cold DMs trigger Instagram's spam detection. Send the link only after they reply.",
                },
                {
                  title: "Start slow if your account is new",
                  body: "Even if the limit is 20/day, start with 5/day for the first week and increase gradually.",
                },
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span>
                    <span className="text-white/70 font-medium">{rule.title} — </span>
                    {rule.body}
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          {/* What happens if flagged */}
          <Section title="WHAT HAPPENS IF YOU GET FLAGGED">
            <ul className="space-y-1">
              {[
                "First offense: 24–48 hour DM block",
                "Repeat offenses: shadowban, reduced reach, account restrictions",
                "Severe violations: permanent action block",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-red-500/50 flex-shrink-0 mt-0.5">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <p className="mt-4 text-xs text-[#606060] italic border-t border-white/[0.04] pt-3">
            BeatBridge tracks your daily count to keep you safe. Your Instagram account is your most valuable asset — protect it.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-xs text-orange-400/60 font-semibold uppercase tracking-[0.1em] mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}
