import type { AirtableRecord } from "./airtable";

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

export function scoreContact(record: AirtableRecord): number {
  let score = 0;

  // 1. Follower count (most important)
  const f = record.followers;
  if (f >= 500 && f <= 2_000) score += 4;
  else if (f > 2_000 && f <= 5_000) score += 3;
  else if (f > 5_000 && f <= 15_000) score += 2;
  else if (f > 15_000 && f <= 30_000) score += 1;
  // 30K+ → 0

  // 2. Profile type
  const t = record.profileType;
  if (t === "Producer" || t === "Sound Engineer") score += 3;
  else if (t === "Manager" || t === "Label" || t === "Studio" || t === "DJ") score += 2;
  else score += 1; // Artist/Rapper, Photographer/Videographer, Other

  // 3. Has public email in description
  if (record.description && EMAIL_RE.test(record.description)) score += 2;

  // 4. Has bio
  if (record.description && record.description.trim().length > 0) score += 1;

  return Math.max(1, Math.min(10, score));
}

export function scoreLabel(score: number): { emoji: string; label: string; classes: string } {
  if (score >= 8) return {
    emoji: "🔥",
    label: "High chance of reply",
    classes: "bg-green-500/20 text-green-300 border-green-500/30",
  };
  if (score >= 5) return {
    emoji: "⚡",
    label: "Moderate chance",
    classes: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  };
  return {
    emoji: "",
    label: "Lower chance",
    classes: "bg-white/[0.05] text-[#606060] border-white/[0.08]",
  };
}
