import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactName, username, contactType, followers, contactBio, artistName } =
    await req.json();

  // Fetch user profile from Supabase (RLS disabled — anon key is fine)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("producer_name, beat_styles, influences, goals")
    .eq("user_id", userId)
    .single();

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

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
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

  return NextResponse.json({ dm });
}
