import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    console.error("[generate-dm] API Key exists:", !!process.env.ANTHROPIC_API_KEY);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[generate-dm] ANTHROPIC_API_KEY is not set");
      return NextResponse.json({ error: "Server misconfiguration: missing API key" }, { status: 500 });
    }

    const body = await req.json();
    const { contactName, username, contactType, followers, contactBio, artistName, userId } = body;

    if (!userId) {
      console.error("[generate-dm] No userId in request body");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[generate-dm] Request for:", { contactName, username, userId });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("producer_name, beat_styles, influences, goals")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.error("[generate-dm] Supabase error:", profileError.message);
    }
    console.error("[generate-dm] Profile found:", !!profile);

    const producerName = profile?.producer_name || "a beatmaker";
    const beatStyles =
      Array.isArray(profile?.beat_styles) && profile.beat_styles.length > 0
        ? profile.beat_styles.join(", ")
        : "various styles";
    const influences = profile?.influences || "various artists";
    const goals =
      Array.isArray(profile?.goals) && profile.goals.length > 0
        ? profile.goals.join(", ")
        : "beat placements";

    const formattedFollowers =
      followers >= 1_000_000
        ? `${(followers / 1_000_000).toFixed(1)}M`
        : followers >= 1_000
        ? `${(followers / 1_000).toFixed(1)}K`
        : String(followers || "unknown");

    const client = new Anthropic({ apiKey });

    console.error("[generate-dm] Calling Anthropic API...");
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a DM writing assistant for beatmakers using a 2-step outreach strategy on Instagram.

Write TWO messages for ${producerName}, a ${beatStyles} producer influenced by ${influences}, reaching out to ${contactName} (@${username}), a ${contactType} with ${formattedFollowers} followers in ${artistName}'s network. Contact bio: ${contactBio || "N/A"}.

MESSAGE 1 — Ice Breaker (CRITICAL RULES):
- Max 2-3 sentences. Sound human, not corporate.
- ABSOLUTELY NO links, URLs, or [LINK] placeholders.
- Be personal and relevant to this specific contact.
- End with a genuine question that invites a reply (e.g. "Would you be open to hearing it?" or "Think it could fit your lane?" or "Got a minute to check it out?").

MESSAGE 2 — Follow-up (sent ONLY after they reply):
- 1 short sentence acknowledging their reply + share the link.
- Use [LINK] as placeholder for the music link.
- Example format: "Appreciate the reply — here it is: [LINK]"

Return ONLY valid JSON in this exact format, no other text:
{"ice_breaker": "...", "follow_up": "..."}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";
    let ice_breaker = "";
    let follow_up = "";
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      ice_breaker = parsed.ice_breaker?.trim() || "";
      follow_up = parsed.follow_up?.trim() || "";
    } catch {
      // fallback: treat whole response as ice_breaker
      ice_breaker = raw;
      follow_up = "Appreciate the reply — here it is: [LINK]";
    }

    console.error("[generate-dm] Success — ice_breaker:", ice_breaker.length, "follow_up:", follow_up.length);
    return NextResponse.json({ ice_breaker, follow_up });
  } catch (err) {
    console.error("[generate-dm] Full error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
