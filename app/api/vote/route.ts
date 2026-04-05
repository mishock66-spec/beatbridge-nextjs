import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId, candidateSlug } = await req.json();

    if (!userId || !candidateSlug) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check total votes for this user
    const { count, error: countErr } = await supabase
      .from("artist_votes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: "max_votes_reached" }, { status: 400 });
    }

    const { error } = await supabase
      .from("artist_votes")
      .insert({ user_id: userId, candidate_slug: candidateSlug });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "already_voted" }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
