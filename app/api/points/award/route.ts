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
      user_id:       userId,
      contact_id:    contactId,
      points_earned: points,
      tier,
    });

    // Fetch current points and increment
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("total_points")
      .eq("user_id", userId)
      .maybeSingle();

    const newPoints = (profile?.total_points ?? 0) + points;

    await supabase.from("user_profiles").upsert(
      { user_id: userId, total_points: newPoints, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ pointsEarned: points, tier, emoji, label, totalPoints: newPoints });
  } catch (err) {
    console.error("[points/award] error:", err);
    return NextResponse.json({ error: "Failed to award points" }, { status: 500 });
  }
}
