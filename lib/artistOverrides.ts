import { createClient } from "@supabase/supabase-js";

export type ArtistOverride = {
  description?: string;
  instagram?: string;
  twitter?: string;
  visible?: boolean;
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Fetch overrides for a single artist slug (e.g. "southside"). Returns {} if none saved. */
export async function getArtistOverride(slug: string): Promise<ArtistOverride> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", `artist_${slug}`)
    .maybeSingle();
  return (data?.value as ArtistOverride) ?? {};
}

/** Fetch overrides for all artists in one query. Returns map of slug → override. */
export async function getAllArtistOverrides(): Promise<Record<string, ArtistOverride>> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("admin_config")
    .select("key, value")
    .like("key", "artist_%");
  const result: Record<string, ArtistOverride> = {};
  for (const row of data ?? []) {
    const slug = (row.key as string).slice(7); // strip "artist_" prefix
    result[slug] = row.value as ArtistOverride;
  }
  return result;
}
