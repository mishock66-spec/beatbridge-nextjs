import { NextRequest, NextResponse } from "next/server";
import { fetchAirtableCount } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const values = searchParams.getAll("suiviPar");

  if (values.length === 0) {
    return NextResponse.json({ error: "Missing suiviPar param" }, { status: 400 });
  }

  try {
    const count = await fetchAirtableCount(values.length === 1 ? values[0] : values);
    return NextResponse.json({ count });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
