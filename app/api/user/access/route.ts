import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ allowed: false, reason: "no_user" });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from("user_profiles")
      .select("plan, subscription_status, trial_start")
      .eq("user_id", userId)
      .single();

    // No profile yet — seed trial and allow
    if (error || !data) {
      await supabase.from("user_profiles").upsert(
        { user_id: userId, trial_start: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      return NextResponse.json({ allowed: true, reason: "trial", trialDaysLeft: 14 });
    }

    // Active paid plan
    const hasPaidPlan =
      data.plan === "lifetime" ||
      (["pro", "premium"].includes(data.plan ?? "") &&
        ["active", "trialing"].includes(data.subscription_status ?? ""));

    if (hasPaidPlan) {
      return NextResponse.json({ allowed: true, reason: "paid" });
    }

    // Trial check
    if (data.trial_start) {
      const trialEnd = new Date(data.trial_start).getTime() + 14 * 24 * 60 * 60 * 1000;
      const trialDaysLeft = Math.ceil((trialEnd - Date.now()) / (24 * 60 * 60 * 1000));
      if (Date.now() < trialEnd) {
        return NextResponse.json({ allowed: true, reason: "trial", trialDaysLeft });
      }
    }

    // Trial expired, no paid plan
    return NextResponse.json({ allowed: false, reason: "trial_expired" });
  } catch {
    // Fail open on unexpected errors
    return NextResponse.json({ allowed: true, reason: "error" });
  }
}
