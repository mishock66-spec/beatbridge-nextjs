import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  trialStart: string | null;
  createdAt: string;
  dmsSent: number;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !isAdmin(body.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch all user_profiles with DM counts
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select(`
      user_id,
      producer_name,
      plan,
      subscription_status,
      trial_start,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  // Fetch DM counts per user
  const { data: dmRows } = await supabase
    .from("dm_activity")
    .select("user_id")
    .eq("action", "sent");

  const dmCounts: Record<string, number> = {};
  for (const row of dmRows ?? []) {
    dmCounts[row.user_id] = (dmCounts[row.user_id] ?? 0) + 1;
  }

  // Fetch all users from Clerk to get emails
  const clerk = await clerkClient();
  const clerkUsers = await clerk.users.getUserList({ limit: 500 });
  const emailMap: Record<string, string> = {};
  for (const u of clerkUsers.data) {
    const email = u.emailAddresses[0]?.emailAddress ?? "";
    emailMap[u.id] = email;
  }

  const users: AdminUser[] = (profiles ?? []).map((p, i) => ({
    id: p.user_id,
    name: p.producer_name ?? `User ${i + 1}`,
    email: emailMap[p.user_id] ?? "—",
    plan: p.plan ?? "free",
    subscriptionStatus: p.subscription_status ?? "—",
    trialStart: p.trial_start ?? null,
    createdAt: p.created_at,
    dmsSent: dmCounts[p.user_id] ?? 0,
  }));

  return NextResponse.json({ users });
}
