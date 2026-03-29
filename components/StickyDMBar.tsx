"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDmLimit, type AccountAge } from "@/lib/dmLimits";

export default function StickyDMBar() {
  const { isSignedIn, user } = useUser();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [accountAge, setAccountAge] = useState<AccountAge | null>(null);
  const [loaded, setLoaded] = useState(false);

  const shouldShow =
    isSignedIn &&
    (pathname === "/dashboard" || pathname.startsWith("/artist/"));

  useEffect(() => {
    if (!shouldShow || !user || !supabase) return;
    setLoaded(false);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    Promise.all([
      supabase
        .from("dm_activity")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("action", "sent")
        .gte("dm_sent_at", todayStart.toISOString()),
      supabase
        .from("user_profiles")
        .select("instagram_account_age")
        .eq("user_id", user.id)
        .single(),
    ])
      .then(([activityRes, profileRes]) => {
        if (activityRes.count !== null) setCount(activityRes.count);
        if (profileRes.data?.instagram_account_age) {
          setAccountAge(profileRes.data.instagram_account_age as AccountAge);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [shouldShow, user]);

  // Real-time: update count when status dropdown changes
  useEffect(() => {
    function onDmSent() { setCount((c) => c + 1); }
    function onDmDecremented() { setCount((c) => Math.max(0, c - 1)); }
    window.addEventListener("dm-sent", onDmSent);
    window.addEventListener("dm-decremented", onDmDecremented);
    return () => {
      window.removeEventListener("dm-sent", onDmSent);
      window.removeEventListener("dm-decremented", onDmDecremented);
    };
  }, []);

  if (!shouldShow || !loaded) return null;

  const limit = getDmLimit(accountAge);
  const pct = Math.min(Math.round((count / limit) * 100), 100);

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
          {count}/{limit}
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
