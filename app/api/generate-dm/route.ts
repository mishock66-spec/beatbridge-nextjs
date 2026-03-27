import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[generate-dm] ANTHROPIC_API_KEY is not set");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const { userId } = await auth();
    if (!userId) {
      console.error("[generate-dm] No userId from Clerk auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { contactName, username, contactType, followers, contactBio, artistName } = body;
    console.log("[generate-dm] Request for:", { contactName, username, userId });

    // Fetch user profile from Supabase (RLS disabled — anon key is fine)
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
      console.error("[generate-dm] Supabase profile fetch error:", profileError.message);
    }
    console.log("[generate-dm] Profile found:", !!profile);

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

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: `You are a DM writing assistant for beatmakers. Write a short, authentic, personalized Instagram DM (max 3 sentences) from a beatmaker to a music industry contact. Sound human, not corporate. No emoji overload. End with [LINK] as placeholder for their music link.`,
      messages: [
        {
          role: "user",
          content: `Write a DM from ${producerName}, a ${beatStyles} producer influenced by ${influences}, whose goal is ${goals}. They are reaching out to ${contactName} (@${username}), a ${contactType} with ${formattedFollowers} followers who is in ${artistName}'s network. Contact bio: ${contactBio || "N/A"}. Make it personal and relevant to both people.`,
        },
      ],
    });

    const dm =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    console.log("[generate-dm] Success, dm length:", dm.length);
    return NextResponse.json({ dm });
  } catch (err) {
    console.error("[generate-dm] Unhandled error:", err);
    return NextResponse.json({ error: "Failed to generate DM" }, { status: 500 });
  }
}
