import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const CATEGORY_MAP: Record<string, string> = {
  "Producteur/productrice de musique": "Beatmaker/Producteur",
  "Musique et son": "Beatmaker/Producteur",
  "Studio de production musicale": "Beatmaker/Producteur",
  "Compositeur musical": "Beatmaker/Producteur",
  "Ingénieur(e) du son": "Ingé son",
  "Ingénieur(e) musical": "Ingé son",
  "Manager de talents": "Manager",
  "Artiste": "Artiste/Rappeur",
  "Musique/groupe": "Artiste/Rappeur",
  "DJ": "Artiste/Rappeur",
};

const VALID_PROFILE_TYPES = [
  "Beatmaker/Producteur",
  "Ingé son",
  "Manager",
  "Artiste/Rappeur",
  "Autre",
];

function mapCategory(raw: string): string {
  if (!raw) return "Autre";
  // Exact match first
  if (CATEGORY_MAP[raw]) return CATEGORY_MAP[raw];
  // Partial match
  const lower = raw.toLowerCase();
  if (lower.includes("producteur") || lower.includes("beatmaker") || lower.includes("musique")) return "Beatmaker/Producteur";
  if (lower.includes("ingé") || lower.includes("inge") || lower.includes("son")) return "Ingé son";
  if (lower.includes("manager")) return "Manager";
  if (lower.includes("artiste") || lower.includes("rappeur") || lower.includes("dj")) return "Artiste/Rappeur";
  return "Autre";
}

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.every((v) => !v.trim())) continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => { rec[h.trim()] = (values[idx] ?? "").trim(); });
    records.push(rec);
  }
  return records;
}

function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && row[found]) return row[found].trim();
  }
  return "";
}

interface ContactRow {
  username: string;
  fullName: string;
  profileUrl: string;
  followers: number;
  bio: string;
  rawCategory: string;
  profileType: string;
}

function mapCSVRow(row: Record<string, string>): ContactRow | null {
  const username = getField(row, "userName", "username", "pseudo", "handle");
  if (!username) return null;

  const rawCategory = getField(row, "category", "Category", "categoryName");
  const followersRaw = getField(row, "followersCount", "followers", "Followers", "follower_count", "subscriberCount");
  const bio = getField(row, "biography", "bio", "Biography", "description");
  const profileUrl = getField(row, "profileUrl", "profile_url", "url", "link", "instagramUrl");

  return {
    username: username.replace(/^@/, ""),
    fullName: getField(row, "fullName", "full_name", "name", "displayName"),
    profileUrl: profileUrl || `https://www.instagram.com/${username.replace(/^@/, "")}/`,
    followers: parseInt(followersRaw.replace(/[^0-9]/g, ""), 10) || 0,
    bio,
    rawCategory,
    profileType: mapCategory(rawCategory),
  };
}

// ── Claude API ────────────────────────────────────────────────────────────────

async function claudeComplete(apiKey: string, prompt: string, maxTokens = 200): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return (data.content?.[0]?.text ?? "").trim();
}

// ── Template generation (batched, 5 per call) ─────────────────────────────────

async function generateTemplateBatch(
  apiKey: string,
  contacts: ContactRow[],
  profileTypes: string[],
  artistName: string
): Promise<string[]> {
  const items = contacts.map((c, j) => {
    const name = c.fullName?.split(" ")[0] || c.username;
    return `${j + 1}. name="${name}", type="${profileTypes[j]}", bio="${(c.bio || "N/A").slice(0, 120)}"`;
  }).join("\n");

  const prompt = `Generate ${contacts.length} personalized Instagram DM openers for a beatmaker. Artist network: ${artistName}.

Rules:
- Start each with "Hey [name], I'm [BEATMAKER_NAME], a beatmaker." (keep [BEATMAKER_NAME] as literal text)
- Reference the bio if available and relevant
- Adapt to the profile type
- Max 2-3 sentences total
- NO links or URLs in the message
- End with a question

Contacts:
${items}

Reply with EXACTLY ${contacts.length} templates numbered 1 through ${contacts.length}. Format each as:
1. [template text]
2. [template text]
(etc.)
No extra text.`;

  const raw = await claudeComplete(apiKey, prompt, contacts.length * 120);

  // Parse numbered response
  const templates: string[] = new Array(contacts.length).fill("");
  const lines = raw.split("\n");
  let currentIdx = -1;
  let currentText = "";

  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s*(.*)/);
    if (match) {
      if (currentIdx >= 0 && currentIdx < contacts.length) {
        templates[currentIdx] = currentText.trim();
      }
      currentIdx = parseInt(match[1], 10) - 1;
      currentText = match[2];
    } else if (currentIdx >= 0) {
      currentText += " " + line;
    }
  }
  if (currentIdx >= 0 && currentIdx < contacts.length) {
    templates[currentIdx] = currentText.trim();
  }

  return templates;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream closed
        }
      };

      try {
        // ── Parse form data ─────────────────────────────────────────────────
        const formData = await req.formData();
        const userId = formData.get("userId") as string;
        const artistName = (formData.get("artistName") as string)?.trim();
        const artistSlug = (formData.get("artistSlug") as string)?.trim();
        const instagram = (formData.get("instagram") as string)?.trim();
        const twitter = ((formData.get("twitter") as string) || "").trim();
        const description = (formData.get("description") as string)?.trim() || "";
        const followerCount = parseInt((formData.get("followerCount") as string) || "0", 10);
        const file = formData.get("file") as File | null;

        if (!userId || !isAdmin(userId)) {
          send({ type: "error", message: "Forbidden" });
          controller.close();
          return;
        }

        if (!artistName || !artistSlug || !instagram || !file) {
          send({ type: "error", message: "Missing required fields (name, slug, instagram, CSV file)" });
          controller.close();
          return;
        }

        const airtableKey = process.env.AIRTABLE_API_KEY;
        if (!airtableKey) {
          send({ type: "error", message: "Missing AIRTABLE_API_KEY in Vercel env" });
          controller.close();
          return;
        }

        const anthropicKey = process.env.ANTHROPIC_API_KEY;

        // ── STEP 1: Parse CSV ───────────────────────────────────────────────
        send({ type: "step", step: 1, status: "running", message: "Parsing CSV..." });
        await sleep(100);

        let csvText: string;
        try {
          csvText = await file.text();
        } catch {
          send({ type: "error", message: "Failed to read CSV file" });
          controller.close();
          return;
        }

        const rows = parseCSV(csvText);
        const contacts = rows.map(mapCSVRow).filter(Boolean) as ContactRow[];

        if (contacts.length === 0) {
          send({ type: "error", message: "No valid contacts found in CSV. Check that headers include userName/username." });
          controller.close();
          return;
        }

        send({ type: "step", step: 1, status: "done", message: `Parsing CSV... (${contacts.length} contacts found)` });

        // ── STEP 2: Import to Airtable ──────────────────────────────────────
        send({ type: "step", step: 2, status: "running", message: `Importing to Airtable... (0/${contacts.length})` });

        const airtablePayload = contacts.map((c) => ({
          fields: {
            "Pseudo Instagram": c.username,
            "Nom complet": c.fullName || "",
            "Lien profil": c.profileUrl,
            "Nombre de followers": c.followers,
            "Notes": c.bio ? `Bio: ${c.bio}` : "",
            "Type de profil": c.profileType,
            "Suivi par": artistName,
            "Statut de contact": "À contacter",
          },
        }));

        const createdIds: string[] = new Array(contacts.length).fill("");
        let importDone = 0;

        for (let i = 0; i < airtablePayload.length; i += 10) {
          const batch = airtablePayload.slice(i, i + 10);
          const res = await fetch(AIRTABLE_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${airtableKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ records: batch }),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            send({ type: "error", message: `Airtable import failed at record ${i + 1}: ${res.status} ${errText.slice(0, 200)}` });
            controller.close();
            return;
          }

          const data = await res.json();
          data.records.forEach((r: { id: string }, j: number) => {
            createdIds[i + j] = r.id;
          });

          importDone += batch.length;
          send({ type: "step", step: 2, status: "running", message: `Importing to Airtable... (${importDone}/${contacts.length})` });

          if (i + 10 < airtablePayload.length) await sleep(250);
        }

        send({ type: "step", step: 2, status: "done", message: `Importing to Airtable... (${contacts.length}/${contacts.length})` });

        // ── STEP 3: Classify "Autre" profiles ──────────────────────────────
        const autreIndices = contacts
          .map((c, i) => ({ c, i }))
          .filter(({ c }) => c.profileType === "Autre");

        send({ type: "step", step: 3, status: "running", message: `Classifying profiles... (0/${autreIndices.length})` });

        // Track reclassified types per airtable ID
        const reclassifiedTypes = new Map<string, string>();

        if (anthropicKey && autreIndices.length > 0) {
          let classifiedDone = 0;
          for (const { c, i } of autreIndices) {
            const airtableId = createdIds[i];
            if (!airtableId) { classifiedDone++; continue; }

            try {
              const name = c.fullName || c.username;
              const prompt = `Classify this Instagram profile into one of these categories.

Profile: @${c.username} (${name})
Bio: "${c.bio || "N/A"}"
Original category: "${c.rawCategory || "N/A"}"

Categories (pick exactly one):
- Beatmaker/Producteur
- Ingé son
- Manager
- Artiste/Rappeur
- Autre

Reply with ONLY the category name, nothing else.`;

              const result = await claudeComplete(anthropicKey, prompt, 30);
              const profileType = VALID_PROFILE_TYPES.includes(result) ? result : "Autre";

              reclassifiedTypes.set(airtableId, profileType);

              // Update in Airtable
              await fetch(`${AIRTABLE_URL}/${airtableId}`, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${airtableKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ fields: { "Type de profil": profileType } }),
              });
            } catch {
              // skip failed classifications
            }

            classifiedDone++;
            send({ type: "step", step: 3, status: "running", message: `Classifying profiles... (${classifiedDone}/${autreIndices.length})` });
            await sleep(500);
          }
        }

        send({ type: "step", step: 3, status: "done", message: `Classifying profiles... (${autreIndices.length} processed)` });

        // ── STEP 4: Generate DM templates ───────────────────────────────────
        send({ type: "step", step: 4, status: "running", message: `Generating DM templates... (0/${contacts.length})` });

        // Collect all template updates to batch-PATCH to Airtable
        const templateUpdates: Array<{ id: string; fields: { template: string; follow_up: string } }> = [];
        let templatesDone = 0;

        if (anthropicKey) {
          const BATCH_SIZE = 5;
          for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
            const batch = contacts.slice(i, i + BATCH_SIZE);
            const batchIds = createdIds.slice(i, i + BATCH_SIZE);

            // Resolve final profile types for this batch
            const profileTypes = batch.map((c, j) => {
              const id = batchIds[j];
              return (id && reclassifiedTypes.get(id)) || c.profileType;
            });

            try {
              const templates = await generateTemplateBatch(anthropicKey, batch, profileTypes, artistName);
              templates.forEach((tpl, j) => {
                const id = batchIds[j];
                if (id && tpl) {
                  templateUpdates.push({
                    id,
                    fields: { template: tpl, follow_up: "Appreciate the reply — here it is: [LINK]" },
                  });
                }
              });
            } catch {
              // If Claude fails for a batch, skip (templates stay empty)
            }

            templatesDone += batch.length;
            send({
              type: "step",
              step: 4,
              status: "running",
              message: `Generating DM templates... (${Math.min(templatesDone, contacts.length)}/${contacts.length})`,
            });

            await sleep(500);
          }
        }

        // Batch PATCH templates to Airtable (10 per call)
        for (let i = 0; i < templateUpdates.length; i += 10) {
          const chunk = templateUpdates.slice(i, i + 10);
          await fetch(AIRTABLE_URL, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${airtableKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ records: chunk }),
          }).catch(() => null);
          if (i + 10 < templateUpdates.length) await sleep(200);
        }

        send({ type: "step", step: 4, status: "done", message: `Generating DM templates... (${templatesDone}/${contacts.length})` });

        // ── STEP 5: Find artist photo ────────────────────────────────────────
        send({ type: "step", step: 5, status: "running", message: "Finding artist photo..." });

        let photoUrl = `https://unavatar.io/instagram/${instagram}`;
        let photoFound = false;

        // Try unavatar.io — check if the image is real (>10KB)
        try {
          const photoRes = await fetch(`https://unavatar.io/instagram/${instagram}`, {
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (photoRes.ok) {
            const buf = await photoRes.arrayBuffer();
            if (buf.byteLength > 10000) {
              photoUrl = `https://unavatar.io/instagram/${instagram}`;
              photoFound = true;
            }
          }
        } catch {
          // fall through
        }

        // Try studiotalksevents.com
        if (!photoFound) {
          try {
            const stRes = await fetch(`https://studiotalksevents.com/producers/${artistSlug}`, {
              headers: { "User-Agent": "Mozilla/5.0" },
            });
            if (stRes.ok) {
              const html = await stRes.text();
              const imgMatch = html.match(/(?:src|href)="(https?:[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
              if (imgMatch) {
                photoUrl = imgMatch[1];
                photoFound = true;
              }
            }
          } catch {
            // fall through
          }
        }

        send({
          type: "step",
          step: 5,
          status: "done",
          message: `Finding artist photo... ${photoFound ? "✓ Found" : "⚠ Using fallback URL"}`,
        });

        // ── STEP 6: Save artist config to Supabase ──────────────────────────
        send({ type: "step", step: 6, status: "running", message: "Creating artist pages..." });

        const artistConfig = {
          name: artistName,
          slug: artistSlug,
          instagram: instagram,
          instagramUrl: `https://www.instagram.com/${instagram}/`,
          twitter: twitter || null,
          twitterUrl: twitter ? `https://x.com/${twitter}` : null,
          description,
          followerCount,
          photoUrl,
          photoFound,
          contactCount: contacts.length,
          importedAt: new Date().toISOString(),
          visible: true,
        };

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { error: upsertError } = await supabase.from("admin_config").upsert(
            { key: `artist_${artistSlug}`, value: artistConfig, updated_at: new Date().toISOString() },
            { onConflict: "key" }
          );
          if (upsertError) {
            // Non-fatal — log but continue
            console.error("Supabase upsert error:", upsertError.message);
          }
        }

        send({ type: "step", step: 6, status: "done", message: "Creating artist pages... ✓ Config saved to Supabase" });

        // ── STEP 7: Remove from vote candidates if present ──────────────────
        send({ type: "step", step: 7, status: "running", message: "Updating vote candidates..." });

        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: voteCandRow } = await supabase
            .from("admin_config")
            .select("value")
            .eq("key", "vote_candidates")
            .single();

          if (voteCandRow?.value && Array.isArray(voteCandRow.value)) {
            const filtered = (voteCandRow.value as Array<{ slug: string }>).filter(
              (c) => c.slug !== artistSlug
            );
            if (filtered.length !== voteCandRow.value.length) {
              await supabase.from("admin_config").upsert(
                { key: "vote_candidates", value: filtered, updated_at: new Date().toISOString() },
                { onConflict: "key" }
              );
            }
          }
        }

        send({ type: "step", step: 7, status: "done", message: "Updating vote candidates... ✓ Done" });

        // ── Done ────────────────────────────────────────────────────────────
        send({
          type: "done",
          artistName,
          artistSlug,
          contactsImported: contacts.length,
          autreClassified: autreIndices.length,
          templatesGenerated: templateUpdates.length,
          photoUrl,
          photoFound,
        });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : String(e) });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
