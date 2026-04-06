/**
 * process-metro-boomin.mjs
 *
 * Task 1: Reclassify records where Type de profil = "Autre" by reading the Notes field.
 * Task 2: Generate template DM + follow_up for records where template = "".
 *
 * Run: node scripts/process-metro-boomin.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local
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
  process.exit(1);
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Classification ──────────────────────────────────────────────────────────

function classifyFromNotes(notes) {
  if (!notes || !notes.trim()) return null;

  const lower = notes.toLowerCase();

  if (
    /\bproducer\b|\bbeatmaker\b|\bbeat maker\b|making beats|sell beats|beat store|riaa|billboard|808\b|trap beat|music producer|studio session|producing|produced by/.test(lower)
  ) return "Beatmaker/Producteur";

  if (
    /mix engineer|sound engineer|audio engineer|mixing\b|mastering|mix &|recording engineer|studio engineer/.test(lower)
  ) return "Ingé son";

  if (
    /\bmanager\b|management|label|\ba&r\b|\ba & r\b|booking agent|talent agent|roster|music executive|ceo.*music|music.*ceo/.test(lower)
  ) return "Manager";

  if (
    /\brapper\b|\bartist\b|\bsinger\b|\bvocalist\b|\bmusician\b|\balbum\b|\btour\b|dropping music|out now|new music|music video|\bep\b|mixtape|dropping soon|stream now|listen now/.test(lower)
  ) return "Artiste/Rappeur";

  return null;
}

// ─── Template generation ──────────────────────────────────────────────────────

function generateTemplate(record) {
  const name = record.fullName || record.username.replace(/^@/, "");
  const notes = (record.notes || "").toLowerCase();

  let reference;
  if (notes.includes("producer") || notes.includes("beatmaker") || notes.includes("making beats")) {
    reference = "know you move with real heat in the studio";
  } else if (notes.includes("rapper") || notes.includes("artist") || notes.includes("vocalist") || notes.includes("singer")) {
    reference = "been following your music";
  } else if (notes.includes("engineer") || notes.includes("mixing") || notes.includes("mastering")) {
    reference = "seen your engineering work";
  } else if (notes.includes("manager") || notes.includes("label") || notes.includes("a&r")) {
    reference = "know you work with serious artists";
  } else if (notes.trim()) {
    reference = "caught your page through Metro Boomin's network";
  } else {
    reference = "caught you in Metro Boomin's circle";
  }

  let pitch;
  if (notes.includes("rapper") || notes.includes("artist") || notes.includes("vocalist") || notes.includes("singer")) {
    pitch = "got some hard trap beats that might fit your sound";
  } else if (notes.includes("producer") || notes.includes("beatmaker")) {
    pitch = "got some trap joints we could build on";
  } else if (notes.includes("manager") || notes.includes("label") || notes.includes("a&r")) {
    pitch = "got some hard trap beats worth passing along";
  } else {
    pitch = "got some hard trap beats I've been sitting on";
  }

  return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. ${reference} — ${pitch}, think it could work?`;
}

// ─── Airtable helpers ─────────────────────────────────────────────────────────

async function fetchAllMetroBoomin() {
  const records = [];
  let offset = null;

  do {
    const parts = [
      "pageSize=100",
      "filterByFormula=" + encodeURIComponent('{Suivi par}="Metro Boomin"'),
      'fields[]=' + encodeURIComponent("Pseudo Instagram"),
      'fields[]=' + encodeURIComponent("Nom complet"),
      'fields[]=' + encodeURIComponent("Type de profil"),
      'fields[]=' + encodeURIComponent("Notes"),
      'fields[]=' + encodeURIComponent("template"),
      'fields[]=' + encodeURIComponent("follow_up"),
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

    if (offset) await sleep(250);
  } while (offset);

  return records;
}

async function batchUpdate(updates) {
  const BATCH = 10;
  let updated = 0;

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
      console.error(`Batch update failed at offset ${i}: ${res.status} — ${body}`);
    } else {
      updated += chunk.length;
    }

    await sleep(250);
  }

  return updated;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching all Metro Boomin records from Airtable…");
  const records = await fetchAllMetroBoomin();
  console.log(`Found ${records.length} records.`);

  const classifyUpdates = [];
  const templateUpdates = [];

  let alreadyClassified = 0;
  let cannotClassify = 0;
  let alreadyHasTemplate = 0;

  for (const record of records) {
    const f = record.fields;
    const profileType = (f["Type de profil"] || "").trim();
    const notes = (f["Notes"] || "").trim();
    const template = (f["template"] || "").trim();
    const fullName = (f["Nom complet"] || "").trim();
    const username = (f["Pseudo Instagram"] || "").trim();

    if (profileType === "Autre") {
      const newType = classifyFromNotes(notes);
      if (newType && newType !== "Autre") {
        classifyUpdates.push({ id: record.id, fields: { "Type de profil": newType } });
      } else {
        cannotClassify++;
      }
    } else {
      alreadyClassified++;
    }

    if (!template) {
      const generated = generateTemplate({ fullName, username, notes });
      templateUpdates.push({
        id: record.id,
        fields: {
          template: generated,
          follow_up: "Appreciate the reply — here it is: [LINK]",
        },
      });
    } else {
      alreadyHasTemplate++;
    }
  }

  console.log(`\n── Task 1: Classify "Autre" profiles ──────────────`);
  console.log(`  Already classified: ${alreadyClassified}`);
  console.log(`  Cannot determine (no useful bio): ${cannotClassify}`);
  console.log(`  To reclassify: ${classifyUpdates.length}`);

  if (classifyUpdates.length > 0) {
    console.log(`  Updating ${classifyUpdates.length} records…`);
    const done = await batchUpdate(classifyUpdates);
    console.log(`  ✓ Updated ${done} records.`);
  }

  console.log(`\n── Task 2: Generate DM templates ───────────────────`);
  console.log(`  Already have template: ${alreadyHasTemplate}`);
  console.log(`  Need template: ${templateUpdates.length}`);

  if (templateUpdates.length > 0) {
    console.log(`  Writing ${templateUpdates.length} templates…`);
    const done = await batchUpdate(templateUpdates);
    console.log(`  ✓ Wrote ${done} templates.`);
  }

  console.log(`\nDone.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
