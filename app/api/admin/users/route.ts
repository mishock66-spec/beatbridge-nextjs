import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function fetchClerkEmails(): Promise<Record<string, string>> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("[admin/users] CLERK_SECRET_KEY is not set");
    return {};
  }

  const emailMap: Record<string, string> = {};
  let offset = 0;
  const limit = 500;

  try {
    while (true) {
      const res = await fetch(
        `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[admin/users] Clerk API error ${res.status}: ${body}`);
        break;
      }

      const users = await res.json();
      if (!Array.isArray(users) || users.length === 0) break;

      for (const u of users) {
        const email =
          u.email_addresses?.[0]?.email_address ??
          u.emailAddresses?.[0]?.emailAddress ??
          "";
        if (u.id && email) emailMap[u.id] = email;
      }

      if (users.length < limit) break;
      offset += limit;
    }
  } catch (e) {
    console.error("[admin/users] Clerk fetch threw:", e);
  }

  return emailMap;
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

  // Fetch all user_profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select(
      "user_id, producer_name, plan, subscription_status, trial_start, created_at"
    )
    .order("created_at", { ascending: false });

  if (profilesError) {
    console.error("[admin/users] Supabase error:", profilesError.message);
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  // Fetch DM counts per user
  const { data: dmRows, error: dmError } = await supabase
    .from("dm_activity")
    .select("user_id")
    .eq("action", "sent");

  if (dmError) console.error("[admin/users] dm_activity error:", dmError.message);

  const dmCounts: Record<string, number> = {};
  for (const row of dmRows ?? []) {
    dmCounts[row.user_id] = (dmCounts[row.user_id] ?? 0) + 1;
  }

  // Fetch emails from Clerk
  const emailMap = await fetchClerkEmails();
  const clerkFailed = Object.keys(emailMap).length === 0;

  const users: AdminUser[] = (profiles ?? []).map((p) => ({
    id: p.user_id,
    name: p.producer_name ?? "",
    email: emailMap[p.user_id] ?? (clerkFailed ? "(Clerk unavailable)" : "—"),
    plan: p.plan ?? "free",
    subscriptionStatus: p.subscription_status ?? "—",
    trialStart: p.trial_start ?? null,
    createdAt: p.created_at,
    dmsSent: dmCounts[p.user_id] ?? 0,
  }));

  return NextResponse.json({ users, clerkFailed });
}
