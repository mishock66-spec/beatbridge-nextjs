import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ plan: "free", isPremium: false });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from("user_profiles")
      .select("plan, subscription_status")
      .eq("user_id", userId)
      .single();

    if (!data) return NextResponse.json({ plan: "free", isPremium: false });

    const isPremium =
      data.plan === "lifetime" ||
      (data.plan === "premium" &&
        ["active", "trialing"].includes(data.subscription_status ?? ""));

    return NextResponse.json({ plan: data.plan ?? "free", isPremium });
  } catch {
    return NextResponse.json({ plan: "free", isPremium: false });
  }
}
