import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAirtableRecords } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("user_profiles")
    .select("plan, subscription_status")
    .eq("user_id", userId)
    .single();

  const isPremium =
    data?.plan === "lifetime" ||
    (data?.plan === "premium" &&
      ["active", "trialing"].includes(data?.subscription_status ?? ""));

  if (!isPremium) {
    return new Response("Premium subscription required", { status: 403 });
  }

  let records;
  try {
    records = await fetchAirtableRecords("Juke Wong");
  } catch {
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }

  const header = ["Username", "Full Name", "Followers", "Profile Type", "Profile URL", "DM Template"];
  const rows = records.map((r) => [
    r.username,
    r.fullName,
    String(r.followers),
    r.profileType,
    r.profileUrl,
    r.template?.replace(/"/g, '""') ?? "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="juke-wong-contacts.csv"',
    },
  });
}
