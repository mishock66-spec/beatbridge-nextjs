import { NextResponse } from "next/server";
import { fetchMutualContacts, type MutualContact } from "@/lib/mutualContacts";

export { type MutualContact };
export const revalidate = 0;

export async function GET() {
  try {
    const contacts = await fetchMutualContacts();
    return NextResponse.json({ contacts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
