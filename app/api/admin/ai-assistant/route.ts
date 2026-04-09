import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ActionFilter = {
  suiviPar?: string;
  profileType?: string;
  followers_gt?: number;
  followers_lt?: number;
  noTemplate?: boolean;
  hasBio?: boolean;
  noBio?: boolean;
  statutDeContact?: string;
  usernameContains?: string;
};

export type ActionPlan = {
  intent: "read" | "mutate" | "explain";
  action:
    | "filter_contacts"
    | "delete_by_filter"
    | "update_by_filter"
    | "find_duplicates"
    | "get_stats"
    | "explain";
  description: string;
  filter?: ActionFilter;
  updateFields?: Record<string, string>;
  explanation?: string;
};

export type PreviewRecord = {
  id: string;
  username: string;
  fullName: string;
  followers: number;
  profileType: string;
  suiviPar: string;
  hasTemplate: boolean;
};

export type DupGroup = {
  username: string;
  records: PreviewRecord[];
  keepId: string;
};

// ── System prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the BeatBridge Admin AI. You translate natural language admin commands into structured JSON action plans.

BEATBRIDGE CONTEXT:
- 6 artist networks: Curren$y, Harry Fraud, Wheezy, Juke Wong, Southside, Metro Boomin
- Airtable base: appW42oNhB9Hl14bq, table: tbl0nVXbK5BQnU5FM

AIRTABLE FIELD NAMES (exact):
- "Pseudo Instagram" → username
- "Nom complet" → full name
- "Nombre de followers" → follower count (number)
- "Type de profil" → profile type. Values: "Beatmaker/Producteur", "Ingé son", "Manager", "Artiste/Rappeur", "Photographe/Vidéaste", "DJ", "Autre"
- "Suivi par" → artist network. Values: "Curren$y", "Harry Fraud", "Wheezy", "Juke Wong", "Southside", "Metro Boomin"
- "Statut de contact" → status (e.g. "Archivé")
- "template" → DM template text (empty string if none)
- "Notes" → bio/description (empty string if none)

BUSINESS RULES:
- "Autre" = unclassified profile type (contacts with no type yet)
- "no template" = template field is empty
- Top contacts cap is 50K followers max (10K for Juke Wong)
- ~6000+ total contacts across all networks

RETURN FORMAT: Return ONLY a raw JSON object, no markdown fences, no explanation text outside the JSON.

JSON SCHEMA:
{
  "intent": "read" | "mutate" | "explain",
  "action": "filter_contacts" | "delete_by_filter" | "update_by_filter" | "find_duplicates" | "get_stats" | "explain",
  "description": "1-sentence human readable description of what you will do",
  "filter": {
    "suiviPar": "Metro Boomin",
    "profileType": "Autre",
    "followers_gt": 50000,
    "followers_lt": 1000,
    "noTemplate": true,
    "hasBio": true,
    "noBio": true,
    "statutDeContact": "Archivé",
    "usernameContains": "studio"
  },
  "updateFields": {
    "Type de profil": "Beatmaker/Producteur"
  },
  "explanation": "plain text answer (only for explain intent)"
}

INTENT RULES:
- intent="read" + action="filter_contacts": list matching contacts
- intent="mutate" + action="delete_by_filter": delete matching contacts
- intent="mutate" + action="update_by_filter": update field on matching contacts (requires updateFields)
- intent="read" + action="find_duplicates": find contacts with duplicate Instagram usernames
- intent="mutate" + action="delete_by_filter" with duplicate logic: handled separately
- intent="read" + action="get_stats": return platform stats (no filter needed)
- intent="explain" + action="explain": answer without fetching data, use explanation field

EXAMPLES:
- "Delete all contacts with more than 50K followers" → intent=mutate, action=delete_by_filter, filter={followers_gt:50000}
- "Show me all Autre contacts in Metro Boomin" → intent=read, action=filter_contacts, filter={suiviPar:"Metro Boomin",profileType:"Autre"}
- "How many contacts have no DM template?" → intent=read, action=filter_contacts, filter={noTemplate:true}
- "Find duplicates" → intent=read, action=find_duplicates
- "Give me platform stats" → intent=read, action=get_stats
- "Which artist has the most contacts?" → intent=read, action=get_stats
- "Reclassify Autre contacts for Southside as producers" → intent=mutate, action=update_by_filter, filter={suiviPar:"Southside",profileType:"Autre"}, updateFields={"Type de profil":"Beatmaker/Producteur"}
- "Delete all archived contacts" → intent=mutate, action=delete_by_filter, filter={statutDeContact:"Archivé"}
- "What is the top contacts follower cap?" → intent=explain, action=explain, explanation="The top contacts cap is 50K followers max (10K for Juke Wong)."`;

// ── Airtable helpers ───────────────────────────────────────────────────────────

function buildFormula(filter: ActionFilter): string {
  const parts: string[] = [];

  if (filter.suiviPar) {
    parts.push(`{Suivi par}="${filter.suiviPar.replace(/"/g, '\\"')}"`);
  }
  if (filter.profileType) {
    parts.push(`{Type de profil}="${filter.profileType.replace(/"/g, '\\"')}"`);
  }
  if (filter.followers_gt !== undefined) {
    parts.push(`{Nombre de followers}>${filter.followers_gt}`);
  }
  if (filter.followers_lt !== undefined) {
    parts.push(`{Nombre de followers}<${filter.followers_lt}`);
  }
  if (filter.noTemplate) {
    parts.push(`OR({template}="",{template}=BLANK())`);
  }
  if (filter.hasBio) {
    parts.push(`AND({Notes}!="",{Notes}!=BLANK())`);
  }
  if (filter.noBio) {
    parts.push(`OR({Notes}="",{Notes}=BLANK())`);
  }
  if (filter.statutDeContact) {
    parts.push(`{Statut de contact}="${filter.statutDeContact.replace(/"/g, '\\"')}"`);
  }
  if (filter.usernameContains) {
    const safe = filter.usernameContains.replace(/["'\\]/g, "");
    parts.push(`SEARCH("${safe}",LOWER({Pseudo Instagram}))`);
  }

  if (parts.length === 0) return "TRUE()";
  if (parts.length === 1) return parts[0];
  return `AND(${parts.join(",")})`;
}

async function fetchAllMatching(
  apiKey: string,
  filter: ActionFilter
): Promise<PreviewRecord[]> {
  const formula = buildFormula(filter);
  const records: PreviewRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ filterByFormula: formula, pageSize: "100" });
    params.append("fields[]", "Pseudo Instagram");
    params.append("fields[]", "Nom complet");
    params.append("fields[]", "Nombre de followers");
    params.append("fields[]", "Type de profil");
    params.append("fields[]", "Suivi par");
    params.append("fields[]", "template");
    if (offset) params.set("offset", offset);

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) throw new Error(`Airtable error ${res.status}`);
    const data = await res.json();

    for (const r of data.records ?? []) {
      records.push({
        id: r.id,
        username: (r.fields["Pseudo Instagram"] as string) ?? "",
        fullName: (r.fields["Nom complet"] as string) ?? "",
        followers: (r.fields["Nombre de followers"] as number) ?? 0,
        profileType: (r.fields["Type de profil"] as string) ?? "",
        suiviPar: (r.fields["Suivi par"] as string) ?? "",
        hasTemplate: !!((r.fields["template"] as string) ?? ""),
      });
    }
    offset = data.offset as string | undefined;
  } while (offset);

  return records;
}

async function fetchAllForDuplicates(apiKey: string): Promise<PreviewRecord[]> {
  return fetchAllMatching(apiKey, {}); // no filter = all records
}

async function batchDelete(apiKey: string, recordIds: string[]): Promise<number> {
  const BATCH = 10;
  let deleted = 0;
  for (let i = 0; i < recordIds.length; i += BATCH) {
    const batch = recordIds.slice(i, i + BATCH);
    const params = new URLSearchParams();
    batch.forEach((id) => params.append("records[]", id));
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) throw new Error(`Airtable delete error ${res.status}`);
    const data = await res.json();
    deleted += (data.records ?? []).length;
  }
  return deleted;
}

async function batchUpdate(
  apiKey: string,
  recordIds: string[],
  fields: Record<string, string>
): Promise<number> {
  const BATCH = 10;
  let updated = 0;
  for (let i = 0; i < recordIds.length; i += BATCH) {
    const batch = recordIds.slice(i, i + BATCH);
    const records = batch.map((id) => ({ id, fields }));
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });
    if (!res.ok) throw new Error(`Airtable update error ${res.status}`);
    const data = await res.json();
    updated += (data.records ?? []).length;
  }
  return updated;
}

function scoreRecord(r: PreviewRecord): number {
  let s = 0;
  if (r.hasTemplate) s += 3;
  if (r.followers > 0) s += 1;
  return s;
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !isAdmin(body.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const airtableKey = process.env.AIRTABLE_API_KEY;
  if (!anthropicKey) return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  if (!airtableKey) return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });

  const { phase } = body;

  // ── Phase "plan": call Claude, get action plan, fetch preview data ──────────
  if (phase === "plan") {
    const { message } = body;
    if (!message?.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    // 1. Call Claude
    const client = new Anthropic({ apiKey: anthropicKey });
    let raw = "";
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
      });
      raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    } catch (e) {
      return NextResponse.json(
        { error: `Claude API error: ${e instanceof Error ? e.message : String(e)}` },
        { status: 500 }
      );
    }

    // 2. Parse JSON from Claude's response
    let plan: ActionPlan;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      plan = JSON.parse(jsonMatch?.[0] ?? raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw },
        { status: 500 }
      );
    }

    // 3. For explain intent: return immediately
    if (plan.intent === "explain" || plan.action === "explain") {
      return NextResponse.json({ plan, explanation: plan.explanation ?? raw });
    }

    // 4. For get_stats: fetch from Supabase (handled in existing stats route)
    if (plan.action === "get_stats") {
      // Call internal stats API
      const statsRes = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://beatbridge-nextjs.vercel.app"}/api/admin/stats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: body.userId }),
        }
      ).catch(() => null);
      const stats = statsRes?.ok ? await statsRes.json().catch(() => null) : null;

      // Also count contacts per artist from Airtable
      const allRecords = await fetchAllForDuplicates(airtableKey);
      const countsByArtist: Record<string, number> = {};
      for (const r of allRecords) {
        if (r.suiviPar) countsByArtist[r.suiviPar] = (countsByArtist[r.suiviPar] ?? 0) + 1;
      }

      return NextResponse.json({
        plan,
        stats,
        contactStats: {
          total: allRecords.length,
          byArtist: countsByArtist,
          noTemplate: allRecords.filter((r) => !r.hasTemplate).length,
          withTemplate: allRecords.filter((r) => r.hasTemplate).length,
        },
      });
    }

    // 5. For find_duplicates
    if (plan.action === "find_duplicates") {
      const allRecords = await fetchAllForDuplicates(airtableKey);
      const byUsername = new Map<string, PreviewRecord[]>();
      for (const r of allRecords) {
        const key = r.username.toLowerCase().replace(/^@/, "").trim();
        if (!key) continue;
        if (!byUsername.has(key)) byUsername.set(key, []);
        byUsername.get(key)!.push(r);
      }

      const dupGroups: DupGroup[] = Array.from(byUsername.entries())
        .filter(([, recs]) => recs.length >= 2)
        .map(([username, recs]) => {
          const sorted = [...recs].sort((a, b) => scoreRecord(b) - scoreRecord(a));
          return { username, records: sorted, keepId: sorted[0].id };
        })
        .sort((a, b) => a.username.localeCompare(b.username));

      return NextResponse.json({
        plan,
        dupGroups,
        totalDups: dupGroups.reduce((s, g) => s + g.records.length - 1, 0),
      });
    }

    // 6. For filter_contacts / delete_by_filter / update_by_filter: fetch matching records
    const records = await fetchAllMatching(airtableKey, plan.filter ?? {}).catch(
      () => [] as PreviewRecord[]
    );

    return NextResponse.json({ plan, records, count: records.length });
  }

  // ── Phase "execute": run the confirmed action ────────────────────────────────
  if (phase === "execute") {
    const { action, recordIds, updateFields, dupGroups: incomingDupGroups } = body;

    try {
      if (action === "delete_contacts") {
        const ids: string[] = recordIds ?? [];
        const deleted = await batchDelete(airtableKey, ids);
        return NextResponse.json({ deleted });
      }

      if (action === "update_contacts") {
        const ids: string[] = recordIds ?? [];
        const fields: Record<string, string> = updateFields ?? {};
        const updated = await batchUpdate(airtableKey, ids, fields);
        return NextResponse.json({ updated });
      }

      if (action === "delete_duplicates") {
        const groups: DupGroup[] = incomingDupGroups ?? [];
        const toDelete = groups.flatMap((g) =>
          g.records.filter((r) => r.id !== g.keepId).map((r) => r.id)
        );
        const deleted = await batchDelete(airtableKey, toDelete);
        return NextResponse.json({ deleted });
      }

      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Execution failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Unknown phase" }, { status: 400 });
}
