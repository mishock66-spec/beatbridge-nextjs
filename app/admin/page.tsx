import { createClient } from "@supabase/supabase-js";
import AdminClient from "@/components/AdminClient";
import { getAllArtistOverrides } from "@/lib/artistOverrides";

export const revalidate = 0;

async function getAdminData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [bannerRes, candidatesRes, textsRes, artistOverrides] = await Promise.all([
    supabase.from("admin_config").select("value").eq("key", "banner").single(),
    supabase.from("admin_config").select("value").eq("key", "vote_candidates").single(),
    supabase.from("admin_config").select("value").eq("key", "site_texts").single(),
    getAllArtistOverrides(),
  ]);

  return {
    banner: bannerRes.data?.value ?? null,
    voteCandidates: candidatesRes.data?.value ?? [],
    siteTexts: textsRes.data?.value ?? {},
    artistOverrides,
  };
}

export default async function AdminPage() {
  const { banner, voteCandidates, siteTexts, artistOverrides } = await getAdminData();

  return (
    <AdminClient
      initialBanner={banner}
      initialVoteCandidates={voteCandidates}
      initialSiteTexts={siteTexts}
      initialArtistOverrides={artistOverrides}
    />
  );
}
