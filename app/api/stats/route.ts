import { fetchTotalConnectionsCount } from "@/lib/airtable";
import { NextResponse } from "next/server";

export const revalidate = 3600;

const TOTAL_ARTISTS = 3;

export async function GET() {
  try {
    const totalConnections = await fetchTotalConnectionsCount();
    return NextResponse.json({ totalConnections, totalArtists: TOTAL_ARTISTS });
  } catch (err) {
    console.error("Stats API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
