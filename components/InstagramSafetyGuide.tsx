"use client";

import { useState } from "react";

export default function InstagramSafetyGuide() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"safety" | "checklist">("safety");

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
        <div className="border-t border-white/[0.06]">
          {/* Tab bar */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setTab("safety")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                tab === "safety"
                  ? "text-orange-400 border-b-2 border-orange-500"
                  : "text-[#606060] hover:text-[#a0a0a0]"
              }`}
            >
              📋 Safety Guide
            </button>
            <button
              onClick={() => setTab("checklist")}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                tab === "checklist"
                  ? "text-orange-400 border-b-2 border-orange-500"
                  : "text-[#606060] hover:text-[#a0a0a0]"
              }`}
            >
              ✅ Profile Checklist
            </button>
          </div>

          {/* Tab content */}
          {tab === "safety" ? <SafetyContent /> : <ChecklistContent />}
        </div>
      )}
    </div>
  );
}

function SafetyContent() {
  return (
    <div className="px-4 pb-5 text-sm text-[#a0a0a0] leading-relaxed">
      <p className="pt-4 pb-3 text-white/70 italic">Before you start reaching out, read this.</p>

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

      <Section title="HOURLY LIMIT">
        <p>
          Never send more than <span className="text-white/70 font-medium">10–15 DMs per hour</span> — regardless of your account age.
        </p>
      </Section>

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
  );
}

export function ChecklistContent() {
  return (
    <div className="px-4 pb-5 text-sm text-[#a0a0a0] leading-relaxed">
      <p className="pt-4 pb-1 text-white/80 font-semibold">
        Set up your Instagram profile before reaching out
      </p>
      <p className="pb-3 text-[#a0a0a0] text-xs">
        Your Instagram profile is your business card. When someone receives your DM, the first thing they do is check your profile. If it&apos;s empty, unprofessional, or has no music — they won&apos;t reply.
      </p>

      <ChecklistSection icon="🎵" title="POST YOUR MUSIC">
        {[
          "Upload beat snippets directly to your feed — 30 to 60 second previews work best",
          "Post at least 6–9 beats so your grid looks professional and active",
          "Add producer tags to your beats so people know it's yours",
          "Reels perform better than static posts — show your production process, your studio, your workflow",
        ]}
      </ChecklistSection>

      <ChecklistSection icon="🔗" title="OPTIMIZE YOUR BIO">
        {[
          "Include your SoundCloud, BeatStars, or Spotify link directly in your bio",
          "Use a link-in-bio tool (Linktree, Beacons) if you want to share multiple links",
          "State clearly what you do — ex: 'Trap/Boom-Bap Producer | Beats available on BeatStars 👇'",
          "Add your email if you're open to inquiries",
        ]}
      </ChecklistSection>

      <ChecklistSection icon="📸" title="PROFILE PHOTO">
        {[
          "Use a real photo of yourself or a clean producer logo — no blurry or random images",
          "Your face builds more trust than a logo for outreach purposes",
        ]}
      </ChecklistSection>

      <ChecklistSection icon="📊" title="CONSISTENCY">
        {[
          "Post regularly — at least 2–3 times per week",
          "An inactive profile with 3 posts from 2 years ago kills your credibility instantly",
          "Engage with other producers and artists — comment, like, respond to stories",
        ]}
      </ChecklistSection>

      <div className="mt-4 border-t border-white/[0.04] pt-3">
        <p className="text-xs text-orange-400/60 font-semibold uppercase tracking-[0.1em] mb-2">WHY THIS MATTERS</p>
        <p className="text-xs text-[#606060] leading-relaxed">
          When you DM someone and they check your profile, they need to hear your sound in 10 seconds. No link needed — your profile does the work. A strong profile can turn a cold DM into a placement without you even asking.
        </p>
      </div>
    </div>
  );
}

function ChecklistSection({ icon, title, children }: { icon: string; title: string; children: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs text-orange-400/60 font-semibold uppercase tracking-[0.1em] mb-2">
        {icon} {title}
      </p>
      <ul className="space-y-1.5">
        {children.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-orange-500/40 flex-shrink-0 mt-0.5">–</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
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
