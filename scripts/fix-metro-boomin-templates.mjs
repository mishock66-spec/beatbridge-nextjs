/**
 * fix-metro-boomin-templates.mjs
 *
 * Regenerates ALL Metro Boomin DM templates using Claude AI.
 * Each template is unique and personalized based on the contact's bio.
 *
 * Run: node scripts/fix-metro-boomin-templates.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env.local ──────────────────────────────────────────────────────────

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

const AIRTABLE_API_KEY = env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY;
const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

if (!AIRTABLE_API_KEY) {
  console.error("❌  AIRTABLE_API_KEY not found in .env.local — add it and retry.");
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error("❌  ANTHROPIC_API_KEY not found in .env.local — add it and retry.");
  console.error("    Add this line to .env.local:  ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const ANTHROPIC_DELAY_MS = 500;  // between AI calls — stay under rate limit
const AIRTABLE_DELAY_MS  = 250;  // between Airtable batch writes

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Fetch all Metro Boomin contacts ─────────────────────────────────────────

async function fetchAllMetroBoomin() {
  const records = [];
  let offset = null;

  do {
    const params = new URLSearchParams({
      pageSize: "100",
      filterByFormula: '{Suivi par}="Metro Boomin"',
    });
    params.append("fields[]", "Pseudo Instagram");
    params.append("fields[]", "Nom complet");
    params.append("fields[]", "Type de profil");
    params.append("fields[]", "Notes");
    params.append("fields[]", "template");
    params.append("fields[]", "follow_up");
    if (offset) params.append("offset", offset);

    const res = await fetch(`${AIRTABLE_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Airtable fetch error ${res.status}: ${body}`);
    }

    const data = await res.json();
    records.push(...data.records);
    offset = data.offset || null;

    if (offset) await sleep(250);
  } while (offset);

  return records;
}

// ─── Generate template via Claude ─────────────────────────────────────────────

async function generateTemplate(fullName, username, bio, profileType, retries = 2) {
  const name = fullName || `@${username}`;

  const prompt = `Write a short personalized Instagram DM for a beatmaker reaching out to this contact:

Contact name: ${name}
Bio: ${bio || "No bio available"}
Profile type: ${profileType || "Unknown"}
Artist they follow: Metro Boomin

STRICT RULES:
- Start EXACTLY with: "Hey [name], I'm [BEATMAKER_NAME], a beatmaker."
- [BEATMAKER_NAME] must stay as literal placeholder text — NEVER replace it
- ALWAYS be polite, warm, humble and respectful — we are asking for something
- NEVER use aggressive, overly familiar or disrespectful language
- Reference something specific from their bio if available
- Adapt pitch to their profile type:
  * Beatmaker/Producteur: connect as fellow producer, reference their credits/style
  * Ingé son: mention needing their engineering ears
  * Manager: pitch for their artists/roster
  * Artiste/Rappeur: pitch a record that fits their sound
  * Autre: politely ask if they can pass your contact to Metro Boomin if they know him
- Max 2-3 sentences total, casual but respectful tone
- Every template must be UNIQUE — never the same twice
- Return ONLY the template text, no quotes, no explanation`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 150,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.status === 529 || res.status === 429) {
        // Rate limited — back off and retry
        const wait = (attempt + 1) * 3000;
        console.warn(`    ⚠  Rate limited (${res.status}), waiting ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Anthropic API error ${res.status}: ${body}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text?.trim();
      if (!text) throw new Error("Empty response from Claude");
      return text;
    } catch (err) {
      if (attempt < retries) {
        console.warn(`    ⚠  Attempt ${attempt + 1} failed: ${err.message} — retrying…`);
        await sleep(1500);
      } else {
        throw err;
      }
    }
  }
}

// ─── Batch update Airtable ─────────────────────────────────────────────────────

async function batchUpdate(updates) {
  const BATCH = 10;
  let updated = 0;

  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);

    const res = await fetch(AIRTABLE_URL, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: chunk }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`  ✗ Batch write failed at offset ${i}: ${res.status} — ${body}`);
    } else {
      updated += chunk.length;
    }

    await sleep(AIRTABLE_DELAY_MS);
  }

  return updated;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching all Metro Boomin contacts from Airtable…");
  const records = await fetchAllMetroBoomin();
  const total = records.length;
  console.log(`Found ${total} contacts.\n`);

  if (total === 0) {
    console.log("No contacts found — check your Airtable filter.");
    process.exit(0);
  }

  const updates = [];
  let errors = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const f = record.fields;

    const username    = (f["Pseudo Instagram"] || "").trim();
    const fullName    = (f["Nom complet"] || "").trim();
    const bio         = (f["Notes"] || "").trim();
    const profileType = (f["Type de profil"] || "").trim();

    process.stdout.write(`  Processing ${i + 1}/${total}: ${fullName || username}… `);

    try {
      const template = await generateTemplate(fullName, username, bio, profileType);
      updates.push({
        id: record.id,
        fields: {
          template,
          follow_up: "Appreciate the reply — here it is: [LINK]",
        },
      });
      console.log("✓");
    } catch (err) {
      console.log(`✗ (${err.message})`);
      errors++;
    }

    // Respect Anthropic rate limits between calls
    if (i < records.length - 1) await sleep(ANTHROPIC_DELAY_MS);
  }

  console.log(`\nGenerated ${updates.length} templates (${errors} errors).`);

  if (updates.length > 0) {
    console.log(`Writing ${updates.length} updates to Airtable…`);
    const written = await batchUpdate(updates);
    console.log(`✓ Wrote ${written} records to Airtable.\n`);
  }

  if (errors > 0) {
    console.log(`⚠  ${errors} contacts failed — re-run to retry them.`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
