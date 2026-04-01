export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getContactTier } from "@/lib/contactTier";

export async function POST(req: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    const { userId, contactId, followers } = await req.json();
    if (!userId || !contactId || followers === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { tier, points, emoji, label } = getContactTier(Number(followers));

    // Guard: don't double-award for the same contact
    const { data: existing } = await supabase
      .from("point_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("contact_id", contactId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ alreadyAwarded: true });
    }

    // Insert transaction
    await supabase.from("point_transactions").insert({
      user_id:      userId,
      contact_id:   contactId,
      points_earned: points,
      tier,
    });

    // Fetch current totals
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("total_points, total_credits")
      .eq("user_id", userId)
      .maybeSingle();

    const prevPoints  = profile?.total_points  ?? 0;
    const prevCredits = profile?.total_credits ?? 0;
    const newPoints   = prevPoints + points;

    // 1 credit per 100 points (based on crossing a new 100-point threshold)
    const newCredits  = prevCredits + (Math.floor(newPoints / 100) - Math.floor(prevPoints / 100));

    await supabase.from("user_profiles").upsert(
      { user_id: userId, total_points: newPoints, total_credits: newCredits, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ pointsEarned: points, tier, emoji, label, totalPoints: newPoints, newCredits });
  } catch (err) {
    console.error("[points/award] error:", err);
    return NextResponse.json({ error: "Failed to award points" }, { status: 500 });
  }
}
