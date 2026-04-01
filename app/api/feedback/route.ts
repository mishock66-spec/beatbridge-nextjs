export const revalidate = 0;

import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[feedback] RESEND_API_KEY is missing");
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const { username, userEmail, description, type, page } = await req.json();

    if (!description) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const subject = `[BeatBridge Feedback] ${type ?? "Feedback"} from ${username ?? "Anonymous"}`;

    const textBody = [
      `Type: ${type ?? "Unknown"}`,
      `From: ${username ?? "Anonymous"}${userEmail ? ` (${userEmail})` : ""}`,
      `Page: ${page ?? "unknown"}`,
      `Time: ${timestamp}`,
      "",
      "Message:",
      description,
    ].join("\n");

    const result = await resend.emails.send({
      from: "BeatBridge <onboarding@resend.dev>",
      to: "mishock66@gmail.com",
      subject,
      text: textBody,
    });

    console.log("[feedback] Resend result:", result);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[feedback] Resend error:", err);
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 });
  }
}
