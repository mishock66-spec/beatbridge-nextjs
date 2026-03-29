import type { AirtableRecord } from "./airtable";

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

function hasEmail(record: AirtableRecord): boolean {
  return !!(record.description && EMAIL_RE.test(record.description));
}

export type Badge = {
  label: string;
  symbol: string;
  classes: string;
  tooltip: string;
};

export function replyProbability(record: AirtableRecord): Badge {
  const f = record.followers;
  const email = hasEmail(record);

  if (f >= 500 && f <= 2_000 && email)
    return { symbol: "🔥", label: "Very likely", classes: "bg-green-500/20 text-green-300 border-green-500/30", tooltip: "Small account + contact info = high reply chance" };
  if (f >= 500 && f <= 2_000)
    return { symbol: "⚡", label: "Likely", classes: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", tooltip: "Small account — tends to read DMs" };
  if (f > 2_000 && f <= 10_000 && email)
    return { symbol: "⚡", label: "Likely", classes: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", tooltip: "Mid-size account with contact info" };
  if (f > 2_000 && f <= 10_000)
    return { symbol: "·", label: "Moderate", classes: "bg-white/[0.05] text-[#707070] border-white/[0.08]", tooltip: "Mid-size account — DMs can get buried" };
  if (f > 10_000 && f <= 30_000)
    return { symbol: "·", label: "Moderate", classes: "bg-white/[0.05] text-[#707070] border-white/[0.08]", tooltip: "Larger account — lower reply rate" };
  return { symbol: "·", label: "Lower", classes: "bg-white/[0.04] text-[#505050] border-white/[0.06]", tooltip: "High-follower accounts rarely reply to cold DMs" };
}

export function contactPriority(record: AirtableRecord): Badge {
  const t = record.profileType;
  if (["Producer", "Sound Engineer", "Studio", "DJ", "Manager", "Label"].includes(t))
    return { symbol: "★", label: "High priority", classes: "bg-orange-500/15 text-orange-300/80 border-orange-500/25", tooltip: "Directly connected to the artist's creative process" };
  return { symbol: "◆", label: "Medium priority", classes: "bg-white/[0.04] text-[#606060] border-white/[0.08]", tooltip: "Part of the network — worth reaching out to" };
}

// Numeric score for sorting — higher = more valuable to DM first
export function contactScore(record: AirtableRecord): number {
  const r = replyProbability(record).label;
  const p = contactPriority(record).label;
  const rs = r === "Very likely" ? 4 : r === "Likely" ? 3 : r === "Moderate" ? 2 : 1;
  const ps = p === "High priority" ? 2 : 1;
  return rs * 2 + ps;
}
