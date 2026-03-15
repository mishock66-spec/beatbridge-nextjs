export const revalidate = 0;

import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId || audienceId === "REPLACE_WITH_AUDIENCE_ID_FROM_RESEND_DASHBOARD") {
      return NextResponse.json({ error: "Audience not configured" }, { status: 500 });
    }

    await resend.contacts.create({
      email: email.trim().toLowerCase(),
      audienceId,
      unsubscribed: false,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Newsletter subscribe error:", err);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
