import { NextRequest } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const ARTIST_FILTERS: Record<string, string | string[]> = {
  "currensy":    ["Curren$y", "CurrenSy"],
  "harry-fraud": "Harry Fraud",
  "wheezy":      "Wheezy",
  "juke-wong":   "Juke Wong",
  "southside":   "Southside",
};

const ARTIST_DISPLAY: Record<string, string> = {
  "Wheezy": "Wheezy",
  "Curren$y": "Curren$y",
  "CurrenSy": "Curren$y",
  "Harry Fraud": "Harry Fraud",
  "Juke Wong": "Juke Wong",
  "Southside": "Southside",
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

function generateTemplate(record: { username: string; fullName: string; profileType: string; notes: string; suiviPar: string }): string {
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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Fetch all records for this artist
        const records: Array<{ id: string; fields: Record<string, unknown> }> = [];
        let offset: string | null = null;
        do {
          const params = new URLSearchParams({
            filterByFormula: formula,
            pageSize: "100",
          });
          params.append("fields[]", "Pseudo Instagram");
          params.append("fields[]", "Nom complet");
          params.append("fields[]", "Type de profil");
          params.append("fields[]", "Notes");
          params.append("fields[]", "Suivi par");
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

        // Build updates
        const updates: Array<{ id: string; fields: Record<string, unknown> }> = [];
        for (const record of records) {
          const f = record.fields;
          const username = ((f["Pseudo Instagram"] as string) || "").trim();
          if (!username) continue;
          const template = generateTemplate({
            username,
            fullName: ((f["Nom complet"] as string) || "").trim(),
            profileType: ((f["Type de profil"] as string) || "").trim(),
            notes: ((f["Notes"] as string) || "").trim(),
            suiviPar: ((f["Suivi par"] as string) || "").trim(),
          });
          updates.push({
            id: record.id,
            fields: { template, follow_up: "Appreciate the reply — here it is: [LINK]" },
          });
        }

        send({ type: "progress", done: 0, total: updates.length });

        // Batch PATCH in groups of 10
        let done = 0;
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
            done += chunk.length;
            send({ type: "progress", done, total: updates.length });
          }
          await sleep(250);
        }

        send({ type: "done", updated: done, total: updates.length });
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
