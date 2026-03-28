import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const keyExists = !!apiKey;
  const keyPrefix = apiKey ? apiKey.slice(0, 16) + "..." : "not set";

  if (!keyExists) {
    return NextResponse.json({ keyExists: false, keyPrefix, error: "ANTHROPIC_API_KEY is not set" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 10,
      messages: [{ role: "user", content: "Say OK" }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ keyExists: true, keyPrefix, success: true, response: text });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ keyExists: true, keyPrefix, success: false, error });
  }
}
