import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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

// ── System prompt (classic plan/execute flow) ──────────────────────────────────

const SYSTEM_PROMPT = `You are the BeatBridge Admin AI — a powerful assistant for managing the BeatBridge platform. You can:

1. Answer questions about BeatBridge data
2. Analyze uploaded images and screenshots
3. Parse and import CSV files with Instagram contacts
4. Query and update Airtable records
5. Give stats and insights about the platform

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

AIRTABLE FIELD IDs (for import/update operations):
- fldNrahDUrSgVljvc — Pseudo Instagram (username)
- fldJEVNir9beLv8Ph — Nom complet (full name)
- fldKKIDVHyYSg2lNh — Lien profil (profile URL)
- fldvT6sZIjc1ypnMw — Nombre de followers
- fld8dCqjrnqCsRSog — Type de profil
- fldgITyqXWRJMA5tV — Statut de contact (default: 'À contacter')
- fld7C9ekFhBlwcy2L — Suivi par (artist name)
- fldpLozVCrvYj62i0 — Notes (bio)
- fldy8ho1lxBh8iB3n — template
- fldLRttkukXJiVs0u — analyzed (checkbox)

BUSINESS RULES:
- "Autre" = unclassified profile type (contacts with no type yet)
- "no template" = template field is empty
- Top contacts cap is 50K followers max (10K for Juke Wong)
- ~6000+ total contacts across all networks

WHEN THE USER UPLOADS A CSV:
- First show a preview: "I can see X rows with these columns: ..."
- Ask which artist network to assign them to (Suivi par field)
- Confirm before importing: "Ready to import X contacts to Airtable for [Artist]. Confirm?"
- To import, call POST /api/admin/import-contacts with adminSecret: "beatbridge-analyzer-2026"
- Report results: how many imported, any errors

WHEN THE USER UPLOADS A SCREENSHOT OR IMAGE:
- Describe what you see in detail
- Take action if relevant (e.g. if it's an Instagram profile, extract the data and offer to add to Airtable)
- If it shows analytics or stats, summarize the key numbers

RETURN FORMAT for structured commands: Return ONLY a raw JSON object, no markdown fences, no explanation text outside the JSON.

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

// ── Agent system prompt (tool-calling flow) ─────────────────────────────────────

const AGENT_SYSTEM_PROMPT = `You are the BeatBridge Admin AI — a powerful assistant with direct API access to platform data via tools.

BEATBRIDGE CONTEXT:
- 6 artist networks: Curren$y, Harry Fraud, Wheezy, Juke Wong, Southside, Metro Boomin
- ~3900 contacts across these networks in Airtable
- Live SaaS platform with paying users

AIRTABLE FIELD IDs (always use these for update/import, never field names):
- fldNrahDUrSgVljvc = Pseudo Instagram (username)
- fldJEVNir9beLv8Ph = Nom complet (full name)
- fldKKIDVHyYSg2lNh = Lien profil (profile URL)
- fldvT6sZIjc1ypnMw = Nombre de followers
- fld8dCqjrnqCsRSog = Type de profil (Beatmaker/Producteur | Ingé son | Manager | Artiste/Rappeur | Photographe/Vidéaste | DJ | Autre)
- fldgITyqXWRJMA5tV = Statut de contact (default: "À contacter")
- fld7C9ekFhBlwcy2L = Suivi par (artist name)
- fldpLozVCrvYj62i0 = Notes (bio)
- fldy8ho1lxBh8iB3n = template
- fldLRttkukXJiVs0u = analyzed (checkbox boolean)

AIRTABLE FILTER FORMULA SYNTAX (for airtable_query):
- {Suivi par}="Metro Boomin"
- {Type de profil}="Autre"
- {Nombre de followers}>50000
- OR({template}="",{template}=BLANK())  ← no template
- AND({Notes}!="",{Notes}!=BLANK())  ← has bio
- SEARCH("keyword",LOWER({Pseudo Instagram}))

TOOL USE GUIDELINES:
1. Always explain what you're about to do before calling a tool
2. For destructive operations (delete/update many records): first call airtable_query to show what will be affected, then ask "Shall I proceed?" — only call airtable_delete/airtable_update after the user confirms
3. After executing: summarize what was done with specific numbers
4. For stats requests: use supabase_query + stripe_query + clerk_query together for a complete picture
5. For CSV imports: verify the data looks correct before calling airtable_import
6. When querying Airtable: use empty formula string "" to get all records (warning: slow for 3900+ records)

RESPONSE STYLE:
- Be concise and actionable
- Use numbers and specifics
- Format counts, lists, and results clearly
- When showing contact data, highlight username, artist, followers, type`;

// ── Airtable helpers (classic flow) ───────────────────────────────────────────

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
  return fetchAllMatching(apiKey, {});
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

// ── Agent tools ────────────────────────────────────────────────────────────────

const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "airtable_query",
    description:
      "Fetch contacts from Airtable with an optional filter formula. Returns records with id, username, fullName, followers, profileType, suiviPar, template, bio, profileUrl, status.",
    input_schema: {
      type: "object" as const,
      properties: {
        formula: {
          type: "string",
          description:
            'Airtable filterByFormula. Use empty string "" for all records. Examples: {Suivi par}="Metro Boomin", OR({template}="",{template}=BLANK()), {Nombre de followers}>50000',
        },
        maxRecords: {
          type: "number",
          description: "Max records to return (default 100, max 1000)",
        },
      },
      required: ["formula"],
    },
  },
  {
    name: "airtable_update",
    description:
      "Update Airtable records by record ID. Use Airtable field IDs (not field names) in the fields object.",
    input_schema: {
      type: "object" as const,
      properties: {
        recordIds: {
          type: "array",
          items: { type: "string" },
          description: "Airtable record IDs to update",
        },
        fields: {
          type: "object",
          description:
            "Field ID → value pairs. Field IDs: fldNrahDUrSgVljvc (username), fldJEVNir9beLv8Ph (fullName), fldvT6sZIjc1ypnMw (followers), fld8dCqjrnqCsRSog (profileType), fldgITyqXWRJMA5tV (status), fld7C9ekFhBlwcy2L (suiviPar), fldpLozVCrvYj62i0 (notes), fldy8ho1lxBh8iB3n (template), fldLRttkukXJiVs0u (analyzed bool)",
        },
      },
      required: ["recordIds", "fields"],
    },
  },
  {
    name: "airtable_delete",
    description: "Permanently delete Airtable records by ID. Irreversible — only call after user confirms.",
    input_schema: {
      type: "object" as const,
      properties: {
        recordIds: {
          type: "array",
          items: { type: "string" },
          description: "Airtable record IDs to delete",
        },
      },
      required: ["recordIds"],
    },
  },
  {
    name: "airtable_import",
    description: "Import new contact records to Airtable. Each record is created as a new row.",
    input_schema: {
      type: "object" as const,
      properties: {
        records: {
          type: "array",
          description: "Contact records to create",
          items: {
            type: "object",
            properties: {
              username: { type: "string", description: "Instagram username (no @ prefix)" },
              fullName: { type: "string" },
              profileUrl: { type: "string" },
              followers: { type: "number" },
              profileType: {
                type: "string",
                enum: ["Beatmaker/Producteur", "Ingé son", "Manager", "Artiste/Rappeur", "Photographe/Vidéaste", "DJ", "Autre"],
              },
              suiviPar: {
                type: "string",
                enum: ["Curren$y", "Harry Fraud", "Wheezy", "Juke Wong", "Southside", "Metro Boomin"],
              },
              bio: { type: "string" },
              template: { type: "string" },
            },
          },
        },
      },
      required: ["records"],
    },
  },
  {
    name: "supabase_query",
    description: "Query Supabase for platform data: user counts, DM stats, plan breakdown, recent signups.",
    input_schema: {
      type: "object" as const,
      properties: {
        query_type: {
          type: "string",
          enum: ["user_count", "dm_stats", "plan_breakdown", "recent_signups"],
          description:
            "user_count: total registered users | dm_stats: DMs sent today + total | plan_breakdown: free/trial/paid counts | recent_signups: last 10 users",
        },
      },
      required: ["query_type"],
    },
  },
  {
    name: "stripe_query",
    description: "Get Stripe subscription data: active subscriber count, MRR, plan breakdown.",
    input_schema: {
      type: "object" as const,
      properties: {
        query_type: {
          type: "string",
          enum: ["overview"],
          description: "overview: active subscribers count, MRR, and plan breakdown",
        },
      },
      required: ["query_type"],
    },
  },
  {
    name: "clerk_query",
    description: "Query Clerk user directory for registration stats or find specific users.",
    input_schema: {
      type: "object" as const,
      properties: {
        query_type: {
          type: "string",
          enum: ["user_count", "list_users", "user_by_email"],
          description: "user_count: total Clerk users | list_users: recent 20 users with emails | user_by_email: find user by email",
        },
        email: {
          type: "string",
          description: "Email to search (only for user_by_email)",
        },
      },
      required: ["query_type"],
    },
  },
];

// ── Agent tool execution ────────────────────────────────────────────────────────

type ToolKeys = {
  airtableKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  stripeKey?: string;
  clerkKey?: string;
};

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  keys: ToolKeys
): Promise<unknown> {
  // ── airtable_query ──────────────────────────────────────────────────────────
  if (name === "airtable_query") {
    const formula = (input.formula as string) || "";
    const maxRecords = Math.min((input.maxRecords as number) || 100, 1000);
    const records: unknown[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (formula) params.set("filterByFormula", formula);
      (
        [
          "Pseudo Instagram",
          "Nom complet",
          "Nombre de followers",
          "Type de profil",
          "Suivi par",
          "template",
          "Notes",
          "Lien profil",
          "Statut de contact",
        ] as const
      ).forEach((f) => params.append("fields[]", f));
      if (offset) params.set("offset", offset);
      const res = await fetch(
        `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${keys.airtableKey}` } }
      );
      if (!res.ok) throw new Error(`Airtable query failed: ${res.status}`);
      const data = await res.json();
      for (const r of data.records ?? []) {
        records.push({
          id: r.id,
          username: r.fields["Pseudo Instagram"] ?? "",
          fullName: r.fields["Nom complet"] ?? "",
          followers: r.fields["Nombre de followers"] ?? 0,
          profileType: r.fields["Type de profil"] ?? "",
          suiviPar: r.fields["Suivi par"] ?? "",
          template: r.fields["template"] ?? "",
          bio: r.fields["Notes"] ?? "",
          profileUrl: r.fields["Lien profil"] ?? "",
          status: r.fields["Statut de contact"] ?? "",
        });
        if (records.length >= maxRecords) break;
      }
      offset = records.length >= maxRecords ? undefined : (data.offset as string | undefined);
    } while (offset);
    return { count: records.length, records };
  }

  // ── airtable_update ─────────────────────────────────────────────────────────
  if (name === "airtable_update") {
    const recordIds = input.recordIds as string[];
    const fields = input.fields as Record<string, unknown>;
    let updated = 0;
    const errors: string[] = [];
    const BATCH = 10;
    for (let i = 0; i < recordIds.length; i += BATCH) {
      const batch = recordIds.slice(i, i + BATCH).map((id) => ({ id, fields }));
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${keys.airtableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: batch }),
      });
      if (!res.ok) {
        errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${res.status}`);
      } else {
        const data = await res.json();
        updated += (data.records ?? []).length;
      }
    }
    return { updated, errors };
  }

  // ── airtable_delete ─────────────────────────────────────────────────────────
  if (name === "airtable_delete") {
    const recordIds = input.recordIds as string[];
    let deleted = 0;
    const errors: string[] = [];
    const BATCH = 10;
    for (let i = 0; i < recordIds.length; i += BATCH) {
      const batch = recordIds.slice(i, i + BATCH);
      const params = new URLSearchParams();
      batch.forEach((id) => params.append("records[]", id));
      const res = await fetch(
        `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${keys.airtableKey}` } }
      );
      if (!res.ok) {
        errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${res.status}`);
      } else {
        const data = await res.json();
        deleted += (data.records ?? []).length;
      }
    }
    return { deleted, errors };
  }

  // ── airtable_import ─────────────────────────────────────────────────────────
  if (name === "airtable_import") {
    type ImportRec = {
      username?: string;
      fullName?: string;
      profileUrl?: string;
      followers?: number;
      profileType?: string;
      suiviPar?: string;
      bio?: string;
      template?: string;
    };
    const rows = input.records as ImportRec[];
    let imported = 0;
    const errors: string[] = [];
    const BATCH = 10;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map((r) => {
        const fields: Record<string, unknown> = { fldgITyqXWRJMA5tV: "À contacter" };
        if (r.username) fields["fldNrahDUrSgVljvc"] = r.username.replace(/^@/, "");
        if (r.fullName) fields["fldJEVNir9beLv8Ph"] = r.fullName;
        if (r.profileUrl) fields["fldKKIDVHyYSg2lNh"] = r.profileUrl;
        if (r.followers) fields["fldvT6sZIjc1ypnMw"] = r.followers;
        if (r.profileType) fields["fld8dCqjrnqCsRSog"] = r.profileType;
        if (r.suiviPar) fields["fld7C9ekFhBlwcy2L"] = r.suiviPar;
        if (r.bio) fields["fldpLozVCrvYj62i0"] = r.bio;
        if (r.template) fields["fldy8ho1lxBh8iB3n"] = r.template;
        return { fields };
      });
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keys.airtableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: batch }),
      });
      if (!res.ok) {
        errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${res.status}`);
      } else {
        const data = await res.json();
        imported += (data.records ?? []).length;
      }
    }
    return { imported, errors };
  }

  // ── supabase_query ──────────────────────────────────────────────────────────
  if (name === "supabase_query") {
    const supabase = createClient(keys.supabaseUrl, keys.supabaseKey);
    const queryType = input.query_type as string;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (queryType === "user_count") {
      const { count } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true });
      return { totalUsers: count ?? 0 };
    }
    if (queryType === "dm_stats") {
      const [today, total] = await Promise.all([
        supabase
          .from("dm_activity")
          .select("*", { count: "exact", head: true })
          .eq("action", "sent")
          .gte("dm_sent_at", todayStart.toISOString()),
        supabase
          .from("dm_activity")
          .select("*", { count: "exact", head: true })
          .eq("action", "sent"),
      ]);
      return { dmsSentToday: today.count ?? 0, dmsSentTotal: total.count ?? 0 };
    }
    if (queryType === "plan_breakdown") {
      const [freeRes, trialRes, paidRes] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .is("plan", null)
          .is("trial_start", null),
        supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .is("plan", null)
          .not("trial_start", "is", null),
        supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .in("plan", ["pro", "premium", "lifetime"]),
      ]);
      return {
        free: freeRes.count ?? 0,
        trial: trialRes.count ?? 0,
        paid: paidRes.count ?? 0,
      };
    }
    if (queryType === "recent_signups") {
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, producer_name, plan, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return { users: data ?? [] };
    }
    return { error: "Unknown query_type" };
  }

  // ── stripe_query ─────────────────────────────────────────────────────────────
  if (name === "stripe_query") {
    if (!keys.stripeKey) return { error: "STRIPE_SECRET_KEY not configured" };
    const stripe = new Stripe(keys.stripeKey);
    const subs = await stripe.subscriptions.list({ status: "active", limit: 100, expand: ["data.items.data.price"] });
    let mrr = 0;
    const planCounts: Record<string, number> = {};
    for (const sub of subs.data) {
      for (const item of sub.items.data) {
        const amount = (item.price.unit_amount ?? 0) / 100;
        const interval = item.price.recurring?.interval;
        mrr += interval === "year" ? amount / 12 : amount;
        const label = item.price.nickname ?? item.price.id;
        planCounts[label] = (planCounts[label] ?? 0) + 1;
      }
    }
    return {
      activeSubscribers: subs.data.length,
      mrr: Math.round(mrr),
      plans: planCounts,
    };
  }

  // ── clerk_query ──────────────────────────────────────────────────────────────
  if (name === "clerk_query") {
    if (!keys.clerkKey) return { error: "CLERK_SECRET_KEY not configured" };
    const queryType = input.query_type as string;
    const headers = { Authorization: `Bearer ${keys.clerkKey}` };

    if (queryType === "user_count") {
      const res = await fetch("https://api.clerk.com/v1/users/count", { headers });
      const data = res.ok ? await res.json() : null;
      return { totalUsers: data?.total_count ?? 0 };
    }
    if (queryType === "list_users") {
      const res = await fetch("https://api.clerk.com/v1/users?limit=20&order_by=-created_at", { headers });
      const users = res.ok ? await res.json() : [];
      return {
        users: Array.isArray(users)
          ? users.slice(0, 20).map((u: Record<string, unknown>) => ({
              id: u.id,
              email:
                (u.email_addresses as Array<{ email_address: string }>)?.[0]
                  ?.email_address ?? "",
              firstName: u.first_name,
              lastName: u.last_name,
              createdAt: u.created_at,
            }))
          : [],
      };
    }
    if (queryType === "user_by_email" && input.email) {
      const res = await fetch(
        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(input.email as string)}`,
        { headers }
      );
      const users = res.ok ? await res.json() : [];
      return { users: Array.isArray(users) ? users : [] };
    }
    return { error: "Unknown query_type" };
  }

  return { error: `Unknown tool: ${name}` };
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

  // ── Phase "agent": Claude native tool calling ──────────────────────────────
  if (phase === "agent") {
    const { message, conversationHistory, image, csvText } = body as {
      message?: string;
      conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
      image?: { base64: string; mediaType: string };
      csvText?: string;
    };

    const client = new Anthropic({ apiKey: anthropicKey });
    const keys: ToolKeys = {
      airtableKey,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      stripeKey: process.env.STRIPE_SECRET_KEY,
      clerkKey: process.env.CLERK_SECRET_KEY,
    };

    // Build messages from conversation history
    type MsgParam = { role: "user" | "assistant"; content: unknown };
    const messages: MsgParam[] = [];

    for (const turn of conversationHistory ?? []) {
      messages.push({ role: turn.role, content: turn.content });
    }

    // Build current user message
    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } };
    const userContent: ContentBlock[] = [];
    if (image) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: image.mediaType, data: image.base64 },
      });
    }
    const textParts: string[] = [];
    if (csvText) textParts.push(`CSV contents (first 100 rows):\n\`\`\`\n${csvText}\n\`\`\``);
    if (message?.trim()) textParts.push(message.trim());
    if (textParts.length === 0) textParts.push("Please analyze this.");
    userContent.push({ type: "text", text: textParts.join("\n\n") });
    messages.push({ role: "user", content: userContent });

    // Agentic loop (max 6 iterations)
    let reply = "";
    for (let iter = 0; iter < 6; iter++) {
      let response: Anthropic.Message;
      try {
        response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: AGENT_SYSTEM_PROMPT,
          tools: AGENT_TOOLS,
          messages: messages as Anthropic.MessageParam[],
        });
      } catch (e) {
        return NextResponse.json(
          { error: `Claude API error: ${e instanceof Error ? e.message : String(e)}` },
          { status: 500 }
        );
      }

      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find((b) => b.type === "text");
        reply = textBlock?.type === "text" ? textBlock.text : "";
        break;
      }

      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content });

        const toolResults: Array<{
          type: "tool_result";
          tool_use_id: string;
          content: string;
        }> = [];

        for (const block of response.content) {
          if (block.type === "tool_use") {
            let result: unknown;
            try {
              result = await executeTool(block.name, block.input as Record<string, unknown>, keys);
            } catch (e) {
              result = { error: e instanceof Error ? e.message : String(e) };
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          }
        }

        messages.push({ role: "user", content: toolResults });
        // Continue loop
      } else {
        // Unexpected stop reason — extract any text and stop
        const textBlock = response.content.find((b) => b.type === "text");
        reply = textBlock?.type === "text" ? textBlock.text : "Unexpected response.";
        break;
      }
    }

    return NextResponse.json({ reply });
  }

  // ── Phase "plan": call Claude, get action plan, fetch preview data ──────────
  if (phase === "plan") {
    const { message } = body;
    if (!message?.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: anthropicKey });
    let raw = "";
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
      });
      // Extract text from first text block; skip tool_use or other block types
      const textBlock = response.content.find((b) => b.type === "text");
      raw = textBlock?.type === "text" ? textBlock.text.trim() : "";
      if (!raw) console.error("[ai-assistant/plan] No text block in Claude response. Content types:", response.content.map((b) => b.type));
    } catch (e) {
      return NextResponse.json(
        { error: `Claude API error: ${e instanceof Error ? e.message : String(e)}` },
        { status: 500 }
      );
    }

    let plan: ActionPlan;
    try {
      // Strip markdown code fences if Claude wraps the response
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      plan = JSON.parse(jsonMatch?.[0] ?? cleaned);
    } catch {
      console.error("[ai-assistant/plan] Failed to parse Claude response as JSON. Raw:", raw.slice(0, 400));
      // Graceful fallback: treat as plain text explanation rather than crashing
      plan = {
        intent: "explain",
        action: "explain",
        description: "Plain text response",
        explanation: raw || "I could not produce a structured response.",
      };
    }

    if (plan.intent === "explain" || plan.action === "explain") {
      return NextResponse.json({ plan, explanation: plan.explanation ?? raw });
    }

    if (plan.action === "get_stats") {
      const statsRes = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://beatbridge-nextjs.vercel.app"}/api/admin/stats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: body.userId }),
        }
      ).catch(() => null);
      const stats = statsRes?.ok ? await statsRes.json().catch(() => null) : null;

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

  // ── Phase "chat": free-form with optional image or CSV ────────────────────────
  if (phase === "chat") {
    const { message, image, csvText } = body as {
      message?: string;
      image?: { base64: string; mediaType: string };
      csvText?: string;
    };

    const client = new Anthropic({ apiKey: anthropicKey });

    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

    const content: ContentBlock[] = [];

    if (image) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: image.mediaType, data: image.base64 },
      });
    }

    const textParts: string[] = [];
    if (csvText) {
      textParts.push(`CSV file contents (first 100 rows):\n\`\`\`\n${csvText}\n\`\`\``);
    }
    if (message?.trim()) {
      textParts.push(message.trim());
    }
    if (textParts.length === 0) {
      textParts.push("Please analyze this.");
    }
    content.push({ type: "text", text: textParts.join("\n\n") });

    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      });
      const reply = response.content[0].type === "text" ? response.content[0].text.trim() : "";
      return NextResponse.json({ reply });
    } catch (e) {
      return NextResponse.json(
        { error: `Claude API error: ${e instanceof Error ? e.message : String(e)}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Unknown phase" }, { status: 400 });
}
