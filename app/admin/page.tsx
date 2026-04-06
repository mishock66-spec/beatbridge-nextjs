import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import AdminClient from "@/components/AdminClient";

export const revalidate = 0;

const ADMIN_EMAIL = "mishock66@gmail.com";

async function getAdminData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [bannerRes, candidatesRes, textsRes] = await Promise.all([
    supabase.from("admin_config").select("value").eq("key", "banner").single(),
    supabase.from("admin_config").select("value").eq("key", "vote_candidates").single(),
    supabase.from("admin_config").select("value").eq("key", "site_texts").single(),
  ]);

  return {
    banner: bannerRes.data?.value ?? null,
    voteCandidates: candidatesRes.data?.value ?? [],
    siteTexts: textsRes.data?.value ?? {},
  };
}

export default async function AdminPage() {
  // ── Server-side auth guard ─────────────────────────────────────────────────
  let isAdmin = false;
  let adminUserId = "";

  try {
    const { userId } = await auth();
    if (userId) {
      const user = await currentUser();
      const email = user?.emailAddresses[0]?.emailAddress ?? "";
      const envUserId = process.env.ADMIN_CLERK_USER_ID;

      const emailMatch = email === ADMIN_EMAIL;
      const idMatch = !envUserId || userId === envUserId;

      if (emailMatch && idMatch) {
        isAdmin = true;
        adminUserId = userId;
      }
    }
  } catch {
    // auth() throws without middleware — silently deny
  }

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const { banner, voteCandidates, siteTexts } = await getAdminData();

  return (
    <AdminClient
      adminUserId={adminUserId}
      initialBanner={banner}
      initialVoteCandidates={voteCandidates}
      initialSiteTexts={siteTexts}
    />
  );
}
