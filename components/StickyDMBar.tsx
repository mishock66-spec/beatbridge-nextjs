"use client";

import { getDmLimit, type AccountAge } from "@/lib/dmLimits";

export default function StickyDMBar({
  dmSentCount,
  accountAge,
  loaded,
}: {
  dmSentCount: number;
  accountAge: AccountAge | null;
  loaded: boolean;
}) {
  if (!loaded) return null;

  const limit = getDmLimit(accountAge);
  const pct = Math.min(Math.round((dmSentCount / limit) * 100), 100);

  let barColor: string;
  let statusText: string;
  let accentColor: string;

  if (pct > 85) {
    barColor = "#ef4444";
    statusText = "Stop for today — risk of flag";
    accentColor = "#ef4444";
  } else if (pct > 60) {
    barColor = "#f97316";
    statusText = "Slow down";
    accentColor = "#f97316";
  } else {
    barColor = "#22c55e";
    statusText = "Safe zone";
    accentColor = "#22c55e";
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[rgba(8,8,8,0.92)] backdrop-blur-[20px] border-t border-white/[0.06] px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        {/* Count */}
        <span
          className="text-xs font-bold tabular-nums flex-shrink-0"
          style={{ color: accentColor }}
        >
          {dmSentCount}/{limit}
        </span>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>

        {/* Status label */}
        <span
          className="text-xs flex-shrink-0 hidden sm:block"
          style={{ color: accentColor }}
        >
          {statusText}
        </span>

        {/* "DMs sent today" label — desktop only */}
        <span className="text-xs text-[#404040] flex-shrink-0 hidden md:block">
          DMs sent today
        </span>
      </div>
    </div>
  );
}
