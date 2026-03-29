"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

export default function DailyWarningBanner() {
  const { isSignedIn, user } = useUser();
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !user || !supabase) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    supabase
      .from("dm_activity")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("dm_sent_at", todayStart.toISOString())
      .then(({ count: c }) => {
        if (c !== null) setCount(c);
      })
      .catch(() => {});
  }, [isSignedIn, user]);

  if (!isSignedIn || count < 10 || dismissed) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/[0.06] px-4 py-3">
      <span className="text-base leading-none mt-0.5 flex-shrink-0">⚠️</span>
      <p className="flex-1 text-sm text-[#a0a0a0] leading-relaxed">
        <span className="text-orange-400 font-semibold">
          You&apos;ve sent {count} DMs today.
        </span>{" "}
        Instagram may flag unusual activity. We recommend stopping for today and resuming tomorrow.
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
