/**
 * regenerate-all-templates.mjs
 *
 * Regenerates ALL DM templates for ALL artists in Airtable.
 *
 * Rules:
 * - Always starts with "Hey [name]" (fullName if set, else @username)
 * - Always includes "I'm [BEATMAKER_NAME], a beatmaker" (literal placeholder)
 * - Uses bio from Notes if available — specific reference required
 * - Format varies per profile type
 * - Commas between clauses, never em dashes inside templates
 * - No links in template — link only in follow_up
 * - follow_up = "Appreciate the reply — here it is: [LINK]"
 *
 * Run: node scripts/regenerate-all-templates.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── .env.local parser ────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
    const map = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      map[key] = val;
    }
    return map;
  } catch {
    return {};
  }
}

const env = loadEnv();
const API_KEY = env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
if (!API_KEY) {
  console.error("AIRTABLE_API_KEY not found in .env.local or environment");
  console.error("Run: AIRTABLE_API_KEY=your_key node scripts/regenerate-all-templates.mjs");
  process.exit(1);
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Suivi par → display name ─────────────────────────────────────────────────

const ARTIST_DISPLAY = {
  "Wheezy": "Wheezy",
  "Curren$y": "Curren$y",
  "CurrenSy": "Curren$y",
  "Harry Fraud": "Harry Fraud",
  "Juke Wong": "Juke Wong",
  "Southside": "Southside",
};

function getArtistName(suiviPar) {
  return ARTIST_DISPLAY[suiviPar] || suiviPar || "this artist";
}

// ─── Profile type normalizer (Airtable raw → bucket) ─────────────────────────

function normalizeType(raw) {
  if (!raw) return "Autre";
  const t = raw.trim().toLowerCase();
  if (t.includes("beatmaker") || t.includes("producteur") || t.includes("producer")) return "Producer";
  if (t.includes("ingé son") || t.includes("inge son") || t.includes("engineer")) return "Engineer";
  if (t.includes("manager") || t.includes("label") || t.includes("studio")) {
    if (t.includes("label") || t.includes("studio")) return "Label/Studio";
    return "Manager";
  }
  if (t.includes("artiste") || t.includes("rapper") || t.includes("artist")) return "Artist";
  if (t.includes("photographe") || t.includes("vidéaste") || t.includes("photographer") || t.includes("videographer")) return "Photo/Video";
  if (t.includes("dj")) return "DJ";
  return "Autre";
}

// ─── Bio extraction helpers ───────────────────────────────────────────────────

/** Extract a specific mention from notes, e.g. a quoted name, city, credit. */
function extractSpecific(notes) {
  if (!notes || !notes.trim()) return null;

  // Quoted names or handles
  const quoted = notes.match(/[""]([^""]{3,30})[""]/);
  if (quoted) return quoted[1];

  // "worked with X" / "produced for X" / "mixed X" / "managing X"
  const workedWith = notes.match(/(?:worked with|produced for|mixed|mastered|managed?|signed?|booking for|opening for|toured with)\s+([A-Z][^\s,.(]{2,30})/i);
  if (workedWith) return workedWith[1];

  // City / state at start of sentence or after "@"
  const city = notes.match(/(?:based in|from|out of|rep(?:resents?)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (city) return city[1];

  return null;
}

/**
 * Build a bio reference sentence for a given profile type and notes.
 * Returns a short, specific phrase (no trailing punctuation).
 */
function buildBioRef(notes, type, artistName) {
  const lower = (notes || "").toLowerCase();
  const specific = extractSpecific(notes);

  switch (type) {
    case "Producer": {
      if (lower.includes("riaa") || lower.includes("platinum") || lower.includes("gold")) {
        return "your placements speak for themselves";
      }
      if (specific && lower.includes(specific.toLowerCase())) {
        return `saw you worked with ${specific}`;
      }
      if (lower.includes("808") || lower.includes("trap")) {
        return "your 808 work is hard";
      }
      if (lower.includes("drill")) return "your drill work is on point";
      if (lower.includes("melodic")) return "your melodic production stands out";
      if (lower.includes("sample") || lower.includes("boom bap")) return "your sample-flipping is different";
      if (lower.includes("beat store") || lower.includes("sell beats")) return "seen your catalog";
      if (notes && notes.trim()) return `caught your production through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    }

    case "Engineer": {
      if (specific) return `seen your work with ${specific}`;
      if (lower.includes("studio")) {
        const studioMatch = notes.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Studios?|Recording|Music))/);
        if (studioMatch) return `seen your work at ${studioMatch[1]}`;
      }
      if (lower.includes("platinum") || lower.includes("gold") || lower.includes("riaa")) return "your credits are serious";
      if (lower.includes("mix") && lower.includes("master")) return "seen your mixing and mastering work";
      if (lower.includes("mixing")) return "your mix credits are solid";
      if (lower.includes("mastering")) return "your mastering work is clean";
      if (notes && notes.trim()) return `caught your engineering work through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    }

    case "Manager": {
      if (specific) return `know you work with ${specific}`;
      if (lower.includes("label")) {
        const labelMatch = notes.match(/([A-Z][a-zA-Z$\s]{2,20}(?:Records?|Music|Entertainment|Group|Label))/);
        if (labelMatch) return `seen your work at ${labelMatch[1].trim()}`;
      }
      if (lower.includes("a&r") || lower.includes("a & r")) return "know you're A&R";
      if (lower.includes("booking")) return "know you handle booking";
      if (notes && notes.trim()) return `caught you through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    }

    case "Label/Studio": {
      if (specific) return `seen your work with ${specific}`;
      if (lower.includes("studio")) {
        const studioMatch = notes.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Studios?|Records?|Music|Entertainment))/);
        if (studioMatch) return `seen what you're building at ${studioMatch[1].trim()}`;
      }
      if (notes && notes.trim()) return `caught your page through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    }

    case "Artist": {
      if (lower.includes("platinum") || lower.includes("gold")) return "your placements are no joke";
      if (specific) return `been following your work with ${specific}`;
      if (lower.includes("drill")) return "your drill sound is hard";
      if (lower.includes("trap")) return "your trap delivery hits different";
      if (lower.includes("melodic") || lower.includes("singer")) return "your melodic sound stands out";
      if (lower.includes("new music") || lower.includes("dropping") || lower.includes("out now")) return "been following your recent drops";
      if (lower.includes("album") || lower.includes("mixtape") || lower.includes("ep")) return "been following your project runs";
      const cityMatch = notes && notes.match(/(?:from|based in|out of|rep(?:ping)?)\s+([A-Z][a-z]+)/i);
      if (cityMatch) return `respect the work coming out of ${cityMatch[1]}`;
      if (notes && notes.trim()) return `been following your music`;
      return `noticed ${artistName} follows you`;
    }

    case "DJ": {
      if (specific) return `seen your sets with ${specific}`;
      if (lower.includes("radio")) return "your radio presence is real";
      if (lower.includes("club") || lower.includes("nightlife")) return "know you move the crowd";
      if (lower.includes("touring") || lower.includes("tour")) return "seen you out on the road";
      if (notes && notes.trim()) return `caught your page through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    }

    case "Photo/Video": {
      if (specific) return `seen your visuals with ${specific}`;
      if (lower.includes("music video") || lower.includes("mvs")) return "your music video work is clean";
      if (lower.includes("photo") && lower.includes("studio")) return "your studio shots are fire";
      if (lower.includes("editorial")) return "your editorial work is clean";
      if (notes && notes.trim()) return `caught your visual work through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    }

    default: // Autre
      return null;
  }
}

// ─── Template generator ───────────────────────────────────────────────────────

function generateTemplate(record) {
  const rawName = record.fullName && record.fullName.trim()
    ? record.fullName.trim()
    : record.username.replace(/^@/, "");

  // Use first name only if full name has multiple words (feels more natural)
  const firstName = rawName.includes(" ") ? rawName.split(" ")[0] : rawName;
  const name = firstName;

  const notes = (record.notes || "").trim();
  const artistName = getArtistName(record.suiviPar);
  const type = normalizeType(record.profileType);
  const bioRef = notes ? buildBioRef(notes, type, artistName) : null;

  switch (type) {
    case "Producer": {
      const ref = bioRef || `caught your page through ${artistName}'s network`;
      return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. ${ref}. Always looking to connect with producers who stay in the studio, think we could build something?`;
    }

    case "Engineer": {
      const ref = bioRef || `caught your engineering page through ${artistName}'s network`;
      return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. ${ref}. The right mix makes all the difference, would love your ears on something I've been working on, think it could be worth your time?`;
    }

    case "Manager": {
      const ref = bioRef || `caught your page through ${artistName}'s network`;
      return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. ${ref}. Got something that could make sense for your artists, think it's worth a listen?`;
    }

    case "Label/Studio": {
      const ref = bioRef || `caught your page through ${artistName}'s network`;
      return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. ${ref}. Got some records that could make sense for your roster, think it's worth a listen?`;
    }

    case "Artist": {
      const ref = bioRef || `caught your page through ${artistName}'s network`;
      return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. ${ref}. Got a record I think fits your lane, think it could work?`;
    }

    case "DJ": {
      const ref = bioRef || `caught your page through ${artistName}'s network`;
      return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. ${ref}. Got something that could hit different in a set, think it could fit your rotation?`;
    }

    case "Photo/Video": {
      const ref = bioRef || `caught your visual work through ${artistName}'s network`;
      return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. ${ref}. You capture the vibe, I make the sound, could be interesting to connect, think it could work?`;
    }

    default: // Autre — non-music contacts
      return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. I noticed ${artistName} follows you, if you're ever in touch with them, I'd really appreciate if you could pass this along. Thank you for your time.`;
  }
}

// ─── Airtable helpers ─────────────────────────────────────────────────────────

async function fetchAllRecords() {
  const records = [];
  let offset = null;

  do {
    const parts = [
      "pageSize=100",
      'fields[]=' + encodeURIComponent("Pseudo Instagram"),
      'fields[]=' + encodeURIComponent("Nom complet"),
      'fields[]=' + encodeURIComponent("Type de profil"),
      'fields[]=' + encodeURIComponent("Notes"),
      'fields[]=' + encodeURIComponent("template"),
      'fields[]=' + encodeURIComponent("follow_up"),
      'fields[]=' + encodeURIComponent("Suivi par"),
    ];
    if (offset) parts.push("offset=" + encodeURIComponent(offset));

    const res = await fetch(`${BASE_URL}?${parts.join("&")}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Airtable fetch error: ${res.status} — ${body}`);
    }

    const data = await res.json();
    records.push(...data.records);
    offset = data.offset || null;

    if (offset) {
      process.stdout.write(`  Fetched ${records.length} records so far…\r`);
      await sleep(250);
    }
  } while (offset);

  return records;
}

async function batchUpdate(updates) {
  const BATCH = 10;
  let updated = 0;
  const total = updates.length;

  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);

    const res = await fetch(BASE_URL, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: chunk }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`\nBatch update failed at offset ${i}: ${res.status} — ${body}`);
    } else {
      updated += chunk.length;
      process.stdout.write(`  Progress: ${updated}/${total}\r`);
    }

    await sleep(250); // respect Airtable rate limit
  }

  process.stdout.write("\n");
  return updated;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching ALL records from Airtable…");
  const records = await fetchAllRecords();
  console.log(`\nFetched ${records.length} total records.\n`);

  // Group by artist for reporting
  const byArtist = {};

  const updates = [];
  let skipped = 0;

  for (const record of records) {
    const f = record.fields;
    const username = (f["Pseudo Instagram"] || "").trim();
    const fullName = (f["Nom complet"] || "").trim();
    const profileType = (f["Type de profil"] || "").trim();
    const notes = (f["Notes"] || "").trim();
    const suiviPar = (f["Suivi par"] || "").trim();

    // Skip records with no username (empty rows)
    if (!username) {
      skipped++;
      continue;
    }

    const artistDisplay = getArtistName(suiviPar);
    if (!byArtist[artistDisplay]) byArtist[artistDisplay] = 0;
    byArtist[artistDisplay]++;

    const template = generateTemplate({
      username,
      fullName,
      profileType,
      notes,
      suiviPar,
    });

    updates.push({
      id: record.id,
      fields: {
        template,
        follow_up: "Appreciate the reply — here it is: [LINK]",
      },
    });
  }

  console.log("Records by artist:");
  for (const [artist, count] of Object.entries(byArtist)) {
    console.log(`  ${artist}: ${count}`);
  }
  console.log(`  Skipped (empty): ${skipped}`);
  console.log(`\nWriting ${updates.length} templates…\n`);

  const done = await batchUpdate(updates);
  console.log(`\n✓ Updated ${done}/${updates.length} records.`);

  // Show a sample of generated templates per artist
  console.log("\n── Sample templates ───────────────────────────────────");
  const seen = new Set();
  for (const update of updates.slice(0, 30)) {
    const rec = records.find((r) => r.id === update.id);
    if (!rec) continue;
    const artist = getArtistName((rec.fields["Suivi par"] || "").trim());
    if (seen.has(artist)) continue;
    seen.add(artist);
    console.log(`\n[${artist}] @${rec.fields["Pseudo Instagram"]}`);
    console.log(`  Type: ${rec.fields["Type de profil"]}`);
    console.log(`  Template: ${update.fields.template}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
