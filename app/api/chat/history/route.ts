export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const MAX_CONVERSATIONS = 50;

// GET /api/chat/history?userId=X&limit=N
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 50);

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, title, updated_at, messages")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ conversations: data ?? [] });
}

// POST /api/chat/history
// Body: { userId, conversation_id?, messages, title? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { userId, conversation_id, messages, title } = body;
  const supabase = getSupabase();

  if (conversation_id) {
    // Update existing conversation
    const { data, error } = await supabase
      .from("chat_conversations")
      .update({ messages, updated_at: new Date().toISOString() })
      .eq("id", conversation_id)
      .eq("user_id", userId)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  }

  // Create new conversation — first enforce the 50-conversation limit
  const { count } = await supabase
    .from("chat_conversations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= MAX_CONVERSATIONS) {
    // Delete the oldest conversation to make room
    const { data: oldest } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: true })
      .limit(1);

    if (oldest?.[0]) {
      await supabase.from("chat_conversations").delete().eq("id", oldest[0].id);
    }
  }

  const convTitle = (title ?? "").slice(0, 50) || "Untitled conversation";
  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({ user_id: userId, messages, title: convTitle })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
