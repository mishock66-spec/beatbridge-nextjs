import { NextRequest } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const ARTIST_FILTERS: Record<string, string | string[]> = {
  "currensy":     ["Curren$y", "CurrenSy"],
  "harry-fraud":  "Harry Fraud",
  "wheezy":       "Wheezy",
  "juke-wong":    "Juke Wong",
  "southside":    "Southside",
  "metro-boomin": "Metro Boomin",
};

const ARTIST_DISPLAY: Record<string, string> = {
  "Wheezy":       "Wheezy",
  "Curren$y":     "Curren$y",
  "CurrenSy":     "Curren$y",
  "Harry Fraud":  "Harry Fraud",
  "Juke Wong":    "Juke Wong",
  "Southside":    "Southside",
  "Metro Boomin": "Metro Boomin",
};

function getArtistName(suiviPar: string) {
  return ARTIST_DISPLAY[suiviPar] || suiviPar || "this artist";
}

function normalizeType(raw: string): string {
  if (!raw) return "Autre";
  const t = raw.trim().toLowerCase();
  if (t.includes("beatmaker") || t.includes("producteur") || t.includes("producer")) return "Producer";
  if (t.includes("ingé son") || t.includes("inge son") || t.includes("engineer")) return "Engineer";
  if (t.includes("label") || t.includes("studio")) return "Label/Studio";
  if (t.includes("manager")) return "Manager";
  if (t.includes("artiste") || t.includes("rapper") || t.includes("artist")) return "Artist";
  if (t.includes("photographe") || t.includes("vidéaste") || t.includes("photographer") || t.includes("videographer")) return "Photo/Video";
  if (t.includes("dj")) return "DJ";
  return "Autre";
}

function extractSpecific(notes: string): string | null {
  if (!notes?.trim()) return null;
  const quoted = notes.match(/[""]([^""]{3,30})[""]/);
  if (quoted) return quoted[1];
  const workedWith = notes.match(/(?:worked with|produced for|mixed|mastered|managed?|signed?|booking for|touring with)\s+([A-Z][^\s,.(]{2,30})/i);
  if (workedWith) return workedWith[1];
  const city = notes.match(/(?:based in|from|out of|rep(?:resents?)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (city) return city[1];
  return null;
}

function buildBioRef(notes: string, type: string, artistName: string): string | null {
  const lower = (notes || "").toLowerCase();
  const specific = extractSpecific(notes);
  switch (type) {
    case "Producer":
      if (lower.includes("riaa") || lower.includes("platinum") || lower.includes("gold")) return "your placements speak for themselves";
      if (specific) return `saw you worked with ${specific}`;
      if (lower.includes("808") || lower.includes("trap")) return "your 808 work is hard";
      if (lower.includes("drill")) return "your drill work is on point";
      if (lower.includes("melodic")) return "your melodic production stands out";
      if (notes?.trim()) return `caught your production through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    case "Engineer":
      if (specific) return `seen your work with ${specific}`;
      if (lower.includes("platinum") || lower.includes("gold")) return "your credits are serious";
      if (lower.includes("mix") && lower.includes("master")) return "seen your mixing and mastering work";
      if (notes?.trim()) return `caught your engineering work through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    case "Manager":
      if (specific) return `know you work with ${specific}`;
      if (lower.includes("a&r")) return "know you're A&R";
      if (lower.includes("booking")) return "know you handle booking";
      if (notes?.trim()) return `caught you through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    case "Label/Studio":
      if (specific) return `seen your work with ${specific}`;
      if (notes?.trim()) return `caught your page through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    case "Artist":
      if (lower.includes("platinum") || lower.includes("gold")) return "your placements are no joke";
      if (specific) return `been following your work with ${specific}`;
      if (lower.includes("drill")) return "your drill sound is hard";
      if (lower.includes("melodic") || lower.includes("singer")) return "your melodic sound stands out";
      if (notes?.trim()) return "been following your music";
      return `noticed ${artistName} follows you`;
    case "DJ":
      if (specific) return `seen your sets with ${specific}`;
      if (lower.includes("radio")) return "your radio presence is real";
      if (notes?.trim()) return `caught your page through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    case "Photo/Video":
      if (specific) return `seen your visuals with ${specific}`;
      if (lower.includes("music video")) return "your music video work is clean";
      if (notes?.trim()) return `caught your visual work through ${artistName}'s network`;
      return `noticed ${artistName} follows you`;
    default:
      return null;
  }
}

function generateTemplateLocal(record: { username: string; fullName: string; profileType: string; notes: string; suiviPar: string }): string {
  const rawName = record.fullName?.trim() || record.username.replace(/^@/, "");
  const name = rawName.includes(" ") ? rawName.split(" ")[0] : rawName;
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
    default:
      return `Hey ${name}, I'm [BEATMAKER_NAME], a beatmaker. I noticed ${artistName} follows you, if you're ever in touch with them, I'd really appreciate if you could pass this along. Thank you for your time.`;
  }
}

// ── Claude Haiku — parallel batch call ───────────────────────────────────────

async function generateTemplatesClaude(
  apiKey: string,
  batch: Array<{ username: string; fullName: string; profileType: string; notes: string; suiviPar: string }>
): Promise<string[]> {
  const artistName = getArtistName(batch[0]?.suiviPar || "");

  const items = batch.map((r, i) => {
    const name = (r.fullName?.trim() || r.username).split(" ")[0] || r.username;
    const type = normalizeType(r.profileType);
    const bio = (r.notes || "").trim().slice(0, 120);
    return `${i + 1}. name="${name}", type="${type}", bio="${bio || "N/A"}"`;
  }).join("\n");

  const prompt = `Generate ${batch.length} personalized Instagram DM openers. Artist network: ${artistName}.

Rules:
- Start each with "Hey [name], I'm [BEATMAKER_NAME], a beatmaker." — keep [BEATMAKER_NAME] as literal placeholder text, never replace it
- Reference the bio if available and relevant
- Adapt pitch to profile type: Producer (beat collab), Engineer (mix/master pitch), Manager (artist pitch), Artist (record pitch), Autre (general networking)
- Always polite and respectful
- Max 2-3 sentences total
- NO links or URLs in the message
- End with a short question

Contacts:
${items}

Reply with EXACTLY ${batch.length} numbered templates. Format:
1. [template text]
2. [template text]
No extra text.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: batch.length * 100,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    // Fall back to local generation for this batch
    return batch.map(generateTemplateLocal);
  }

  const data = await res.json();
  const raw: string = data.content?.[0]?.text ?? "";

  // Parse numbered response
  const templates: string[] = new Array(batch.length).fill("");
  const lines = raw.split("\n");
  let currentIdx = -1;
  let currentText = "";

  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s*(.*)/);
    if (match) {
      if (currentIdx >= 0 && currentIdx < batch.length) {
        templates[currentIdx] = currentText.trim();
      }
      currentIdx = parseInt(match[1], 10) - 1;
      currentText = match[2];
    } else if (currentIdx >= 0) {
      currentText += " " + line.trim();
    }
  }
  if (currentIdx >= 0 && currentIdx < batch.length) {
    templates[currentIdx] = currentText.trim();
  }

  // Fill any blanks with local fallback
  return templates.map((t, i) => t || generateTemplateLocal(batch[i]));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !body?.artistSlug) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
  }
  if (!isAdmin(body.userId)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing AIRTABLE_API_KEY" }), { status: 500 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const emptyOnly: boolean = body.emptyOnly ?? true;

  const filterValues = ARTIST_FILTERS[body.artistSlug];
  if (!filterValues) {
    return new Response(JSON.stringify({ error: "Unknown artist slug" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const values = Array.isArray(filterValues) ? filterValues : [filterValues];
  const formulaParts = values.map((v) => `{Suivi par}="${v}"`);
  const formula = formulaParts.length === 1 ? formulaParts[0] : `OR(${formulaParts.join(",")})`;

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
        // ── Fetch all records ──────────────────────────────────────────────────
        const records: Array<{ id: string; fields: Record<string, unknown> }> = [];
        let offset: string | null = null;

        do {
          const params = new URLSearchParams({ filterByFormula: formula, pageSize: "100" });
          params.append("fields[]", "Pseudo Instagram");
          params.append("fields[]", "Nom complet");
          params.append("fields[]", "Type de profil");
          params.append("fields[]", "Notes");
          params.append("fields[]", "Suivi par");
          if (emptyOnly) params.append("fields[]", "template");
          if (offset) params.append("offset", offset);

          const res = await fetch(`${BASE_URL}?${params.toString()}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            send({ type: "error", message: `Fetch failed: ${res.status} ${text}` });
            controller.close();
            return;
          }
          const data = await res.json();
          records.push(...data.records);
          offset = data.offset || null;
          if (offset) await sleep(250);
        } while (offset);

        // ── Filter if emptyOnly ────────────────────────────────────────────────
        const toProcess = emptyOnly
          ? records.filter((r) => !((r.fields["template"] as string) || "").trim())
          : records;

        send({ type: "progress", done: 0, total: toProcess.length, emptyOnly });

        if (toProcess.length === 0) {
          send({ type: "done", updated: 0, total: records.length, skipped: records.length });
          controller.close();
          return;
        }

        // ── Generate templates — parallel batches of 5 ────────────────────────
        const CLAUDE_BATCH = 5;   // contacts per Claude call
        const PARALLEL = 5;       // simultaneous Claude calls

        // Group into Claude batches
        const claudeBatches: Array<Array<{ id: string; username: string; fullName: string; profileType: string; notes: string; suiviPar: string }>> = [];
        for (let i = 0; i < toProcess.length; i += CLAUDE_BATCH) {
          claudeBatches.push(
            toProcess.slice(i, i + CLAUDE_BATCH).map((r) => ({
              id: r.id,
              username: ((r.fields["Pseudo Instagram"] as string) || "").trim(),
              fullName: ((r.fields["Nom complet"] as string) || "").trim(),
              profileType: ((r.fields["Type de profil"] as string) || "").trim(),
              notes: ((r.fields["Notes"] as string) || "").trim(),
              suiviPar: ((r.fields["Suivi par"] as string) || "").trim(),
            }))
          );
        }

        // Collect template results: id → template string
        const templateResults = new Map<string, string>();
        let processedCount = 0;

        // Run in groups of PARALLEL Claude batches simultaneously
        for (let i = 0; i < claudeBatches.length; i += PARALLEL) {
          const parallelGroup = claudeBatches.slice(i, i + PARALLEL);

          const results = await Promise.all(
            parallelGroup.map(async (batch) => {
              try {
                const templates = anthropicKey
                  ? await generateTemplatesClaude(anthropicKey, batch)
                  : batch.map(generateTemplateLocal);
                return batch.map((r, j) => ({ id: r.id, template: templates[j] || generateTemplateLocal(r) }));
              } catch {
                return batch.map((r) => ({ id: r.id, template: generateTemplateLocal(r) }));
              }
            })
          );

          for (const groupResult of results) {
            for (const { id, template } of groupResult) {
              templateResults.set(id, template);
              processedCount++;
            }
          }

          send({ type: "progress", done: processedCount, total: toProcess.length });

          // Small pause between parallel groups to respect Anthropic rate limits
          if (i + PARALLEL < claudeBatches.length) await sleep(300);
        }

        // ── Batch PATCH to Airtable (10 per call) ─────────────────────────────
        const updates = Array.from(templateResults.entries()).map(([id, template]) => ({
          id,
          fields: { template, follow_up: "Appreciate the reply — here it is: [LINK]" },
        }));

        let patchedCount = 0;
        for (let i = 0; i < updates.length; i += 10) {
          const chunk = updates.slice(i, i + 10);
          const patchRes = await fetch(BASE_URL, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ records: chunk }),
          });
          if (patchRes.ok) {
            patchedCount += chunk.length;
          }
          if (i + 10 < updates.length) await sleep(200);
        }

        send({
          type: "done",
          updated: patchedCount,
          total: records.length,
          skipped: records.length - toProcess.length,
        });
      } catch (e) {
        send({ type: "error", message: String(e) });
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
