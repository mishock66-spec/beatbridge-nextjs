import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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

  // Get one representative row per batch_id + recipient count
  const { data, error } = await supabase
    .from("messages")
    .select("batch_id, title, type, is_broadcast, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by batch_id
  const batches = new Map<string, {
    batchId: string; title: string; type: string;
    isBroadcast: boolean; createdAt: string; count: number;
  }>();

  for (const row of data ?? []) {
    if (batches.has(row.batch_id)) {
      batches.get(row.batch_id)!.count++;
    } else {
      batches.set(row.batch_id, {
        batchId: row.batch_id,
        title: row.title,
        type: row.type,
        isBroadcast: row.is_broadcast,
        createdAt: row.created_at,
        count: 1,
      });
    }
  }

  return NextResponse.json({ history: Array.from(batches.values()) });
}
