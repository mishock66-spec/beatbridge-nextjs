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

  const total_sent    = activity.filter((r) => r.action === "sent").length;
  const total_replied = activity.filter((r) => r.action === "replied").length;

  const userMap: Record<string, { dms_sent: number; replies_received: number }> = {};
  for (const row of activity) {
    if (!userMap[row.user_id]) userMap[row.user_id] = { dms_sent: 0, replies_received: 0 };
    if (row.action === "sent")    userMap[row.user_id].dms_sent++;
    if (row.action === "replied") userMap[row.user_id].replies_received++;
  }

  const allSortedByDMs = Object.entries(userMap).sort((a, b) => b[1].dms_sent - a[1].dms_sent);
  const top10Ids = allSortedByDMs.slice(0, 10).map(([id]) => id);
  const allUserIds = Object.keys(userMap);
  const idsToFetch = userId && !top10Ids.includes(userId)
    ? [...new Set([...allUserIds, userId])]
    : allUserIds;

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, username, total_points, total_credits")
    .in("user_id", idsToFetch);

  const profileMap: Record<string, { username: string; total_points: number; total_credits: number }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.user_id] = {
      username:      p.username ?? "Producer",
      total_points:  p.total_points  ?? 0,
      total_credits: p.total_credits ?? 0,
    };
  }

  const leaderboard = allSortedByDMs.slice(0, 10).map(([uid, stats], i) => ({
    rank:             i + 1,
    user_id:          uid,
    username:         profileMap[uid]?.username ?? "Producer",
    dms_sent:         stats.dms_sent,
    replies_received: stats.replies_received,
    total_points:     profileMap[uid]?.total_points ?? 0,
  }));

  // Points-sorted leaderboard (top 10 by points)
  const allWithPoints = Object.keys(userMap).map((uid) => ({
    user_id:          uid,
    username:         profileMap[uid]?.username ?? "Producer",
    dms_sent:         userMap[uid].dms_sent,
    replies_received: userMap[uid].replies_received,
    total_points:     profileMap[uid]?.total_points ?? 0,
  }));
  const leaderboardByPoints = allWithPoints
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 10)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  let my_rank = null;
  if (userId && !top10Ids.includes(userId)) {
    const idx = allSortedByDMs.findIndex(([uid]) => uid === userId);
    if (idx !== -1) {
      const [uid, stats] = allSortedByDMs[idx];
      my_rank = {
        rank:             idx + 1,
        user_id:          uid,
        username:         profileMap[uid]?.username ?? "Producer",
        dms_sent:         stats.dms_sent,
        replies_received: stats.replies_received,
        total_points:     profileMap[uid]?.total_points ?? 0,
      };
    }
  }

  return NextResponse.json({ leaderboard, leaderboardByPoints, total_sent, total_replied, my_rank });
}
