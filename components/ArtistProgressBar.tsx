"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function getBarColor(pct: number): { color: string; glow: string } {
  if (pct > 75) return { color: "#22c55e", glow: "0 0 12px rgba(34,197,94,0.75)" };
  if (pct > 50) return { color: "#f59e0b", glow: "0 0 8px rgba(245,158,11,0.75)" };
  if (pct > 25) return { color: "#fb923c", glow: "0 0 8px rgba(251,146,60,0.75)" };
  return { color: "#f97316", glow: "0 0 8px rgba(249,115,22,0.75)" };
}

function getMilestoneBadge(pct: number): string | null {
  if (pct >= 100) return "👑 Network complete!";
  if (pct >= 75) return "🎯 Almost done";
  if (pct >= 50) return "⚡ Halfway there";
  if (pct >= 25) return "🔥 Heating up";
  return null;
}

export default function ArtistProgressBar({
  artistSlug,
  totalContacts,
}: {
  artistSlug: string;
  totalContacts: number;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [dmsCount, setDmsCount] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id || !supabase) {
      setDmsCount(0);
      return;
    }
    supabase
      .from("dm_status")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("artist_slug", artistSlug)
      .neq("status", "To contact")
      .then(({ count, error }) => {
        if (error) console.error("ArtistProgressBar fetch error:", error);
        setDmsCount(count ?? 0);
      });
  }, [isLoaded, isSignedIn, user?.id, artistSlug]);

  // Defer width animation so CSS transition fires after mount
  useEffect(() => {
    if (dmsCount !== null) {
      const t = setTimeout(() => setAnimated(true), 60);
      return () => clearTimeout(t);
    }
  }, [dmsCount]);

  // Don't render until Clerk resolves
  if (!isLoaded) return null;

  const signedOut = !isSignedIn;
  const pct =
    totalContacts > 0 && dmsCount !== null
      ? Math.min(Math.round((dmsCount / totalContacts) * 100), 100)
      : 0;
  const displayPct = animated ? pct : 0;
  const { color, glow } = getBarColor(pct);
  const badge = getMilestoneBadge(pct);

  return (
    <div className="mb-4">
      {/* Header row: label / badge / percentage */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.08em] text-[#505050]">
          Network progress
        </span>
        <div className="flex items-center gap-2">
          {badge && !signedOut && (
            <span
              className="text-[10px] font-semibold milestone-flash"
              style={{ color }}
            >
              {badge}
            </span>
          )}
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: signedOut ? "#404040" : color }}
          >
            {signedOut ? "—" : `${pct}%`}
          </span>
        </div>
      </div>

      {/* Track */}
      <div
        className="relative h-2 rounded-full"
        style={{ background: "#1a1a1a" }}
      >
        {/* Milestone tick marks at 25 / 50 / 75 % */}
        {[25, 50, 75].map((tick) => (
          <div
            key={tick}
            className="absolute top-0 bottom-0 w-px z-10"
            style={{
              left: `${tick}%`,
              background:
                !signedOut && pct >= tick
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,255,255,0.07)",
            }}
          />
        ))}

        {/* Fill bar */}
        {!signedOut && (
          <div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: `${displayPct}%`,
              background: color,
              boxShadow: displayPct > 0 ? glow : "none",
              transition: "width 0.8s ease, box-shadow 0.8s ease",
            }}
          />
        )}

        {/* Spark at bar tip */}
        {!signedOut && displayPct > 0 && displayPct < 100 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full animate-pulse z-20"
            style={{
              left: `calc(${displayPct}% - 5px)`,
              background: "white",
              boxShadow: `0 0 10px 3px ${color}`,
              transition: "left 0.8s ease",
            }}
          />
        )}
      </div>

      {/* Signed-out hint */}
      {signedOut && (
        <p className="text-[10px] text-[#404040] mt-1.5">
          Sign in to track your progress
        </p>
      )}
    </div>
  );
}
