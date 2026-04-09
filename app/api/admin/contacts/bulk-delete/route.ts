import { NextRequest, NextResponse } from "next/server";

function isAdmin(userId: string) {
  const adminId = process.env.ADMIN_CLERK_USER_ID;
  return !adminId || userId === adminId;
}

const BASE_ID = "appW42oNhB9Hl14bq";
const TABLE_ID = "tbl0nVXbK5BQnU5FM";

const BATCH_SIZE = 10;

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.userId || !isAdmin(body.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recordIds: string[] = body.recordIds ?? [];
  if (!recordIds.length) {
    return NextResponse.json({ error: "No record IDs provided" }, { status: 400 });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing AIRTABLE_API_KEY" }, { status: 500 });

  let deleted = 0;

  for (let i = 0; i < recordIds.length; i += BATCH_SIZE) {
    const batch = recordIds.slice(i, i + BATCH_SIZE);
    const params = new URLSearchParams();
    batch.forEach((id) => params.append("records[]", id));

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Airtable error at batch ${i / BATCH_SIZE + 1}: ${res.status} ${text}`, deleted },
        { status: 500 }
      );
    }

    const data = await res.json();
    deleted += (data.records ?? []).length;
  }

  return NextResponse.json({ ok: true, deleted });
}
