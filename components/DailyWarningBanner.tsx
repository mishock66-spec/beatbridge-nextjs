"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { getDmLimit, type AccountAge } from "@/lib/dmLimits";

export default function DailyWarningBanner() {
  const { isSignedIn, user } = useUser();
  const [count, setCount] = useState(0);
  const [limit, setLimit] = useState(20);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !user || !supabase) { setReady(true); return; }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    Promise.all([
      supabase
        .from("dm_activity")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("dm_sent_at", todayStart.toISOString()),
      supabase
        .from("user_profiles")
        .select("instagram_account_age")
        .eq("user_id", user.id)
        .single(),
    ])
      .then(([activityRes, prefRes]) => {
        if (activityRes.count !== null) setCount(activityRes.count);
        if (prefRes.data?.instagram_account_age) {
          setLimit(getDmLimit(prefRes.data.instagram_account_age as AccountAge));
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [isSignedIn, user]);

  const threshold = Math.ceil(limit * 0.75);
  if (!ready || !isSignedIn || count < threshold || dismissed) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/[0.06] px-4 py-3">
      <span className="text-base leading-none mt-0.5 flex-shrink-0">⚠️</span>
      <p className="flex-1 text-sm text-[#a0a0a0] leading-relaxed">
        <span className="text-orange-400 font-semibold">
          You&apos;ve sent {count} DMs today.
        </span>{" "}
        Instagram may flag unusual activity. Take a break and resume tomorrow.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 text-[#505050] hover:text-[#a0a0a0] transition-colors text-lg leading-none mt-0.5"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
