/**
 * fix-autre-templates.mjs
 *
 * Regenerates templates for ALL contacts where Type de profil is "Autre"
 * (or any non-music type that maps to "Other") across ALL artists.
 *
 * New format:
 * "Hey [name], I'm [BEATMAKER_NAME], a beatmaker. I noticed [Artist] follows you —
 *  I would love to send them a beat I made that I think could fit their sound.
 *  If you ever get the chance to pass my contact along to them, I would really
 *  appreciate it. Thank you so much for your time."
 *
 * Run: node scripts/fix-autre-templates.mjs
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
  console.error("Run: node scripts/fix-autre-templates.mjs");
  process.exit(1);
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Profile type: is it "Autre" / non-music? ─────────────────────────────────

// These are the Airtable raw values that map to the "Other" bucket
const AUTRE_TYPES = new Set([
  "Autre",
  "Entourage",
  "Entrepreneur",
  "Journalist",
  "Media",
  "autre",
]);

function isAutre(rawType) {
  if (!rawType || !rawType.trim()) return true; // blank = Autre
  const t = rawType.trim();
  if (AUTRE_TYPES.has(t)) return true;
  // Anything not clearly a music role is Autre
  const lower = t.toLowerCase();
  const isMusicRole =
    lower.includes("beatmaker") ||
    lower.includes("producteur") ||
    lower.includes("producer") ||
    lower.includes("ingé son") ||
    lower.includes("inge son") ||
    lower.includes("engineer") ||
    lower.includes("manager") ||
    lower.includes("label") ||
    lower.includes("artiste") ||
    lower.includes("rapper") ||
    lower.includes("artist") ||
    lower.includes("photographe") ||
    lower.includes("vidéaste") ||
    lower.includes("photographer") ||
    lower.includes("videographer") ||
    lower.includes("dj") ||
    lower.includes("studio");
  return !isMusicRole;
}

// ─── Artist display name ──────────────────────────────────────────────────────

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

// ─── Template generator ───────────────────────────────────────────────────────

function generateAutreTemplate(record) {
  const rawName = record.fullName && record.fullName.trim()
    ? record.fullName.trim()
    : record.username.replace(/^@/, "");

  // Use first name if full name has multiple words
  const name = rawName.includes(" ") ? rawName.split(" ")[0] : rawName;
  const artistName = getArtistName(record.suiviPar);

  return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. I noticed ${artistName} follows you — I would love to send them a beat I made that I think could fit their sound. If you ever get the chance to pass my contact along to them, I would really appreciate it. Thank you so much for your time.`;
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

    await sleep(250);
  }

  process.stdout.write("\n");
  return updated;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching ALL records to identify Autre-type contacts…");
  const records = await fetchAllRecords();
  console.log(`\nFetched ${records.length} total records.\n`);

  const updates = [];
  let skipped = 0;
  const byArtist = {};

  for (const record of records) {
    const f = record.fields;
    const username = (f["Pseudo Instagram"] || "").trim();
    const fullName = (f["Nom complet"] || "").trim();
    const profileType = (f["Type de profil"] || "").trim();
    const suiviPar = (f["Suivi par"] || "").trim();

    if (!username) { skipped++; continue; }
    if (!isAutre(profileType)) continue;

    const artistDisplay = getArtistName(suiviPar);
    byArtist[artistDisplay] = (byArtist[artistDisplay] || 0) + 1;

    const template = generateAutreTemplate({ username, fullName, suiviPar });
    updates.push({
      id: record.id,
      fields: {
        template,
        follow_up: "Appreciate the reply — here it is: [LINK]",
      },
    });
  }

  console.log("Autre-type contacts by artist:");
  for (const [artist, count] of Object.entries(byArtist)) {
    console.log(`  ${artist}: ${count}`);
  }
  if (skipped > 0) console.log(`  Skipped (empty username): ${skipped}`);
  console.log(`\nUpdating ${updates.length} Autre templates…\n`);

  if (updates.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  const done = await batchUpdate(updates);
  console.log(`\n✓ Updated ${done}/${updates.length} records.`);

  // Sample
  console.log("\n── Sample templates ───────────────────────────────────");
  for (const update of updates.slice(0, 5)) {
    const rec = records.find((r) => r.id === update.id);
    if (!rec) continue;
    console.log(`\n@${rec.fields["Pseudo Instagram"]} (${rec.fields["Type de profil"] || "—"}) — ${getArtistName((rec.fields["Suivi par"] || "").trim())}`);
    console.log(`  ${update.fields.template}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
