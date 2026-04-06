import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !isAdmin(body.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const [totalRes, trialRes, paidRes, dmsTodayRes, dmsTotalRes] = await Promise.all([
    supabase.from("user_profiles").select("user_id", { count: "exact", head: true }),
    supabase
      .from("user_profiles")
      .select("user_id", { count: "exact", head: true })
      .is("plan", null)
      .not("trial_start", "is", null),
    supabase
      .from("user_profiles")
      .select("user_id", { count: "exact", head: true })
      .in("plan", ["pro", "premium", "lifetime"]),
    supabase
      .from("dm_activity")
      .select("id", { count: "exact", head: true })
      .eq("action", "sent")
      .gte("dm_sent_at", todayStart.toISOString()),
    supabase
      .from("dm_activity")
      .select("id", { count: "exact", head: true })
      .eq("action", "sent"),
  ]);

  return NextResponse.json({
    totalUsers: totalRes.count ?? 0,
    trialUsers: trialRes.count ?? 0,
    paidUsers: paidRes.count ?? 0,
    dmsSentToday: dmsTodayRes.count ?? 0,
    dmsSentTotal: dmsTotalRes.count ?? 0,
  });
}
