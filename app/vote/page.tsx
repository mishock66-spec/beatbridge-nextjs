import { createClient } from "@supabase/supabase-js";
import VoteClient from "@/components/VoteClient";
import { auth } from "@clerk/nextjs/server";

export const revalidate = 0;

const CANDIDATE_SLUGS = [
  "pierre-bourne",
  "southside",
  "murda-beatz",
  "tay-keith",
  "nick-mira",
];

async function getVoteData(userId: string | null) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch all vote counts grouped by candidate_slug
  const { data: rows } = await supabase
    .from("artist_votes")
    .select("candidate_slug");

  const counts: Record<string, number> = {};
  for (const slug of CANDIDATE_SLUGS) counts[slug] = 0;
  for (const row of rows ?? []) {
    if (counts[row.candidate_slug] !== undefined) {
      counts[row.candidate_slug]++;
    }
  }

  // Fetch user's existing votes
  let userVotes: string[] = [];
  if (userId) {
    const { data: userRows } = await supabase
      .from("artist_votes")
      .select("candidate_slug")
      .eq("user_id", userId);
    userVotes = (userRows ?? []).map((r) => r.candidate_slug);
  }

  return { counts, userVotes };
}

export default async function VotePage() {
  // We try to get the server-side userId via auth() — this works in pages
  // even without middleware (read-only, no redirect). Falls back to null.
  let userId: string | null = null;
  try {
    const { userId: uid } = await auth();
    userId = uid;
  } catch {
    // No middleware — auth() may throw; we fall back to null
  }

  const { counts, userVotes } = await getVoteData(userId);

  return <VoteClient initialCounts={counts} initialUserVotes={userVotes} />;
}
