import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ leaderboard: [], total_sent: 0, total_replied: 0, my_rank: null });
  }

  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;

  const { data: activity } = await supabase
    .from("dm_activity")
    .select("user_id, action");

  if (!activity || activity.length === 0) {
    return NextResponse.json({ leaderboard: [], total_sent: 0, total_replied: 0, my_rank: null });
  }

  const total_sent = activity.filter((r) => r.action === "sent").length;
  const total_replied = activity.filter((r) => r.action === "replied").length;

  const userMap: Record<string, { dms_sent: number; replies_received: number }> = {};
  for (const row of activity) {
    if (!userMap[row.user_id]) userMap[row.user_id] = { dms_sent: 0, replies_received: 0 };
    if (row.action === "sent") userMap[row.user_id].dms_sent++;
    if (row.action === "replied") userMap[row.user_id].replies_received++;
  }

  const allSorted = Object.entries(userMap).sort((a, b) => b[1].dms_sent - a[1].dms_sent);
  const top10Ids = allSorted.slice(0, 10).map(([id]) => id);
  const idsToFetch =
    userId && !top10Ids.includes(userId) ? [...top10Ids, userId] : top10Ids;

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, username")
    .in("user_id", idsToFetch);

  const usernameMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    usernameMap[p.user_id] = p.username;
  }

  const leaderboard = allSorted.slice(0, 10).map(([uid, stats], i) => ({
    rank: i + 1,
    user_id: uid,
    username: usernameMap[uid] ?? "Producer",
    dms_sent: stats.dms_sent,
    replies_received: stats.replies_received,
  }));

  let my_rank = null;
  if (userId && !top10Ids.includes(userId)) {
    const idx = allSorted.findIndex(([uid]) => uid === userId);
    if (idx !== -1) {
      const [uid, stats] = allSorted[idx];
      my_rank = {
        rank: idx + 1,
        user_id: uid,
        username: usernameMap[uid] ?? "Producer",
        dms_sent: stats.dms_sent,
        replies_received: stats.replies_received,
      };
    }
  }

  return NextResponse.json({ leaderboard, total_sent, total_replied, my_rank });
}
