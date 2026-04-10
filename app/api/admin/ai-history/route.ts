import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/admin/ai-history?userId=xxx
// Returns last 50 messages sorted by created_at ASC
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabase();
  const { data, error } = await db
    .from("admin_ai_conversations")
    .select("id, role, content, mode, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[ai-history/GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

// POST /api/admin/ai-history
// Body: { userId, role, content, mode }
export async function POST(req: NextRequest) {
  let body: { userId?: string; role?: string; content?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, role, content, mode } = body;
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!role || !content) {
    return NextResponse.json({ error: "Missing role or content" }, { status: 400 });
  }

  const db = supabase();
  const { error } = await db.from("admin_ai_conversations").insert({
    user_id: userId,
    role,
    content,
    mode: mode ?? "classic",
  });

  if (error) {
    console.error("[ai-history/POST]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/ai-history?userId=xxx
// Clears all messages for that user
export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabase();
  const { error } = await db
    .from("admin_ai_conversations")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("[ai-history/DELETE]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
