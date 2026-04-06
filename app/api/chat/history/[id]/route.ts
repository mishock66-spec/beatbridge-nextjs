export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// DELETE /api/chat/history/[id]
// Body: { userId }
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body?.userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", params.id)
    .eq("user_id", body.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
