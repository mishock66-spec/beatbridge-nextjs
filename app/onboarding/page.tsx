"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_AGE_LIMITS, type AccountAge } from "@/lib/dmLimits";
import AvatarUpload from "@/components/AvatarUpload";

// ─── Social link helpers ───────────────────────────────────────────────────────

function SocialField({
  label, icon, value, onChange, placeholder, type,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: "text" | "url";
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-[#606060] mb-1.5">
        <span className="text-[#505050]">{icon}</span>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm min-h-[44px]"
      />
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function BeatstarsIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8l6 3.6v7.2l-6 3.6-6-3.6V8.4L12 4.8zm0 2.4L7.2 9.6v4.8L12 16.8l4.8-2.4V9.6L12 7.2z"/>
    </svg>
  );
}

function SoundCloudIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M1.175 12.225c-.015 0-.03 0-.044.003-.03-.344-.014-.71.052-1.075a4.23 4.23 0 011.482-2.61 4.232 4.232 0 012.778-1.01c.14 0 .28.007.417.022a5.91 5.91 0 011.97-2.473A5.905 5.905 0 0111.25 4.2c1.54 0 2.94.586 3.986 1.545a5.87 5.87 0 011.647 3.107 3.523 3.523 0 011.046-.158 3.537 3.537 0 013.537 3.537 3.537 3.537 0 01-3.537 3.537H1.175A1.175 1.175 0 010 14.593a1.175 1.175 0 011.175-1.175v-.193z"/>
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

// Hardcoded for testing — will be wired to Stripe later
const USER_PLAN: "free" | "pro" | "premium" = "pro";
const PLAN_LIMIT: Record<"pro" | "premium", number> = { pro: 50, premium: Infinity };

const BEAT_STYLES = ["Trap", "Boom-Bap", "Drill", "Lo-fi", "R&B", "Afrobeats", "Pop", "Other"];
const GOALS = ["Beat placements", "Collabs", "Sync licensing", "Label deal", "Management"];

const ACCOUNT_AGE_OPTIONS: { value: AccountAge; label: string; sublabel: string }[] = [
  { value: "new",         label: "New account",         sublabel: "Less than 1 month old" },
  { value: "growing",     label: "Growing account",     sublabel: "1 to 6 months old" },
  { value: "established", label: "Established account", sublabel: "More than 6 months old" },
];

type GeneratedResult = {
  username: string;
  fullName: string;
  profileType: string;
  followers: number;
  artistSlug: string;
  artistName: string;
  preview: string;
};

type GenState =
  | { status: "fetching" }
  | { status: "upsell" }
  | { status: "generating"; current: number; total: number }
  | { status: "done"; total: number; results: GeneratedResult[] };

type Contact = {
  username: string;
  fullName: string;
  profileType: string;
  followers: number;
  description: string;
  artistSlug: string;
  artistName: string;
};

function fmtFollowers(n: number) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── GenerationReport ─────────────────────────────────────────────────────────

function GenerationReport({ results }: { results: GeneratedResult[] }) {
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(new Set());

  function toggle(slug: string) {
    setOpenSlugs((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  // Group by artist
  const byArtist = results.reduce<Record<string, { name: string; contacts: GeneratedResult[] }>>(
    (acc, r) => {
      if (!acc[r.artistSlug]) acc[r.artistSlug] = { name: r.artistName, contacts: [] };
      acc[r.artistSlug].contacts.push(r);
      return acc;
    },
    {}
  );

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
        <p className="text-sm font-semibold text-white mb-1">✓ All contacts already have DMs.</p>
        <Link href="/dashboard" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
          Go to Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <p className="text-base font-black text-white">✓ {results.length} DMs generated successfully</p>
        <p className="text-xs text-[#606060] mt-0.5">Grouped by artist — click to expand</p>
      </div>

      {/* Artist sections */}
      <div className="divide-y divide-white/[0.04] max-h-[60vh] overflow-y-auto">
        {Object.entries(byArtist).map(([slug, { name, contacts }]) => {
          const isOpen = openSlugs.has(slug);
          return (
            <div key={slug}>
              {/* Collapsible header */}
              <button
                type="button"
                onClick={() => toggle(slug)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-left min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-orange-400">{name}</span>
                  <span className="text-xs text-[#505050]">{contacts.length} contacts</span>
                </div>
                <svg
                  className={`w-4 h-4 text-[#505050] transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Contact rows */}
              {isOpen && (
                <div className="border-t border-white/[0.04] divide-y divide-white/[0.03]">
                  {contacts.map((c) => (
                    <div key={c.username} className="px-5 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                      <div className="flex items-center gap-2 flex-shrink-0 sm:w-36">
                        <span className="text-xs font-semibold text-white truncate">@{c.username}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#606060] flex-shrink-0">
                        <span>{c.profileType}</span>
                        {fmtFollowers(c.followers) && (
                          <>
                            <span className="text-[#333]">·</span>
                            <span>{fmtFollowers(c.followers)}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-[#808080] italic leading-relaxed sm:flex-1 truncate sm:truncate-none sm:whitespace-normal">
                        &ldquo;{c.preview}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors"
        >
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [beatStyles, setBeatStyles] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [influences, setInfluences] = useState("");
  const [bio, setBio] = useState("");
  const [producerName, setProducerName] = useState("");
  const [instagramAccountAge, setInstagramAccountAge] = useState<AccountAge | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [genState, setGenState] = useState<GenState | null>(null);

  // Social links
  const [socialLinks, setSocialLinks] = useState({
    instagram_url: "",
    beatstars_url: "",
    soundcloud_url: "",
    youtube_url: "",
    spotify_url: "",
  });
  const [savingSocial, setSavingSocial] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    async function checkProfile() {
      if (!supabase || !user) { setChecking(false); return; }
      const { data } = await supabase
        .from("user_profiles")
        .select("id, producer_name, beat_styles, influences, goals, bio, instagram_account_age, instagram_url, beatstars_url, soundcloud_url, youtube_url, spotify_url")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setProducerName(data.producer_name || "");
        setBeatStyles(data.beat_styles || []);
        setInfluences(data.influences || "");
        setGoals(data.goals || []);
        setBio(data.bio || "");
        if (data.instagram_account_age) {
          setInstagramAccountAge(data.instagram_account_age as AccountAge);
        }
        setSocialLinks({
          instagram_url:  data.instagram_url  || "",
          beatstars_url:  data.beatstars_url  || "",
          soundcloud_url: data.soundcloud_url || "",
          youtube_url:    data.youtube_url    || "",
          spotify_url:    data.spotify_url    || "",
        });
        setIsEdit(true);
      }
      setChecking(false);
    }
    checkProfile();
  }, [isLoaded, isSignedIn, user, router]);

  async function selectAccountAge(age: AccountAge) {
    setInstagramAccountAge(age);
    if (!user || !supabase) return;
    await supabase
      .from("user_profiles")
      .upsert(
        { user_id: user.id, instagram_account_age: age, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      )
      .catch(() => {});
  }

  function togglePill(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  async function runAutoGeneration(userId: string) {
    setGenState({ status: "fetching" });

    let contacts: Contact[] = [];
    try {
      const res = await fetch("/api/get-contacts-for-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      contacts = data.contacts ?? [];
    } catch {
      // If fetching contacts fails, fall back to normal redirect
      router.push(isEdit ? "/dashboard" : "/artists");
      return;
    }

    const limit = USER_PLAN === "premium" ? contacts.length : (PLAN_LIMIT[USER_PLAN] ?? 50);
    const toGenerate = contacts.slice(0, limit);

    if (toGenerate.length === 0) {
      setGenState({ status: "done", total: 0, results: [] });
      return;
    }

    setGenState({ status: "generating", current: 0, total: toGenerate.length });

    const results: GeneratedResult[] = [];

    for (let i = 0; i < toGenerate.length; i++) {
      const contact = toGenerate[i];
      try {
        const dmRes = await fetch("/api/generate-dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactName: contact.fullName,
            username:    contact.username,
            contactType: contact.profileType,
            followers:   contact.followers,
            contactBio:  contact.description,
            artistName:  contact.artistName,
            userId,
          }),
        });
        if (dmRes.ok) {
          const { ice_breaker } = await dmRes.json();
          if (ice_breaker && supabase) {
            await supabase
              .from("dm_status")
              .upsert(
                {
                  user_id:     userId,
                  artist_slug: contact.artistSlug,
                  username:    contact.username,
                  ice_breaker,
                  updated_at:  new Date().toISOString(),
                },
                { onConflict: "user_id,artist_slug,username" }
              )
              .catch(() => {});
            results.push({
              username:    contact.username,
              fullName:    contact.fullName,
              profileType: contact.profileType,
              followers:   contact.followers,
              artistSlug:  contact.artistSlug,
              artistName:  contact.artistName,
              preview:     ice_breaker.length > 60
                ? ice_breaker.slice(0, 60) + "..."
                : ice_breaker,
            });
          }
        }
      } catch {
        // Skip this contact silently
      }

      setGenState({ status: "generating", current: i + 1, total: toGenerate.length });

      if (i < toGenerate.length - 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
      }
    }

    setGenState({ status: "done", total: results.length, results });
    toast.success(`Your DMs are ready! ${results.length} contacts generated.`, {
      duration: 4000,
      position: "bottom-right",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !supabase) return;
    setSaving(true);
    setError("");
    try {
      const { error: err } = await supabase.from("user_profiles").upsert(
        {
          user_id:               user.id,
          producer_name:         producerName.trim(),
          beat_styles:           beatStyles,
          influences:            influences.trim(),
          goals,
          bio:                   bio.trim(),
          instagram_account_age: instagramAccountAge,
          updated_at:            new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (err) throw err;
      setSaving(false);

      if (USER_PLAN === "free") {
        setGenState({ status: "upsell" });
        return;
      }

      await runAutoGeneration(user.id);
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  async function handleSaveSocialLinks() {
    if (!user || !supabase) return;
    setSavingSocial(true);
    const { error: err } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id:        user.id,
          instagram_url:  socialLinks.instagram_url.trim(),
          beatstars_url:  socialLinks.beatstars_url.trim(),
          soundcloud_url: socialLinks.soundcloud_url.trim(),
          youtube_url:    socialLinks.youtube_url.trim(),
          spotify_url:    socialLinks.spotify_url.trim(),
          updated_at:     new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    setSavingSocial(false);
    if (err) {
      toast.error("Something went wrong, please try again.");
    } else {
      toast.success("Social links updated ✓");
    }
  }

  if (!isLoaded || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isGenerating =
    genState?.status === "fetching" ||
    genState?.status === "generating";

  return (
    <main className="min-h-screen px-4 py-12 max-w-xl mx-auto">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.1em] text-orange-500 font-medium mb-3">
          {isEdit ? "BeatBridge" : "Welcome to BeatBridge"}
        </p>
        <h1 className="text-3xl font-light tracking-[0.02em] text-white mb-2">
          {isEdit ? "Edit your profile" : "Set up your profile"}
        </h1>
        <p className="text-[#a0a0a0] text-sm">
          We&apos;ll use this to generate personalized DMs for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Profile picture */}
        <div className="flex justify-center">
          <AvatarUpload />
        </div>

        {/* Producer name */}
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.1em] text-[#606060]">
            Your producer / artist name
          </label>
          <input
            type="text"
            value={producerName}
            onChange={(e) => setProducerName(e.target.value)}
            placeholder="e.g. Metro Boomin"
            required
            disabled={isGenerating}
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm min-h-[44px] disabled:opacity-50"
          />
        </div>

        {/* Beat styles */}
        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-[0.1em] text-[#606060]">
            What type of beats do you make?
          </label>
          <div className="flex flex-wrap gap-2">
            {BEAT_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                disabled={isGenerating}
                onClick={() => togglePill(beatStyles, setBeatStyles, style)}
                className={`text-sm px-4 py-2 rounded-lg border transition-all duration-200 min-h-[44px] disabled:opacity-50 ${
                  beatStyles.includes(style)
                    ? "bg-orange-500/20 border-orange-500/60 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                    : "bg-white/[0.03] border-white/[0.08] text-[#a0a0a0] hover:border-white/20 hover:text-white"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Influences */}
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.1em] text-[#606060]">
            Who are your main influences?
          </label>
          <input
            type="text"
            value={influences}
            onChange={(e) => setInfluences(e.target.value)}
            placeholder="e.g. Metro Boomin, Alchemist, Wheezy"
            disabled={isGenerating}
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm min-h-[44px] disabled:opacity-50"
          />
        </div>

        {/* Goals */}
        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-[0.1em] text-[#606060]">
            What&apos;s your goal?
          </label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((goal) => (
              <button
                key={goal}
                type="button"
                disabled={isGenerating}
                onClick={() => togglePill(goals, setGoals, goal)}
                className={`text-sm px-4 py-2 rounded-lg border transition-all duration-200 min-h-[44px] disabled:opacity-50 ${
                  goals.includes(goal)
                    ? "bg-orange-500/20 border-orange-500/60 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                    : "bg-white/[0.03] border-white/[0.08] text-[#a0a0a0] hover:border-white/20 hover:text-white"
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.1em] text-[#606060]">
            Tell us about yourself
            <span className="ml-2 normal-case tracking-normal font-normal text-[#404040]">
              {bio.length}/300
            </span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 300))}
            rows={4}
            disabled={isGenerating}
            placeholder="Your background, journey, what you're working on..."
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm resize-none disabled:opacity-50"
          />
        </div>

        {/* Instagram account age */}
        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-[0.1em] text-[#606060]">
            Instagram account age
            <span className="ml-2 normal-case tracking-normal font-normal text-[#404040]">
              sets your daily DM limit
            </span>
          </label>
          <div className="flex flex-col gap-2">
            {ACCOUNT_AGE_OPTIONS.map(({ value, label, sublabel }) => {
              const isSelected = instagramAccountAge === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => selectAccountAge(value)}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 text-left min-h-[44px] disabled:opacity-50"
                  style={
                    isSelected
                      ? { border: "2px solid #f97316", background: "rgba(249, 115, 22, 0.1)" }
                      : { border: "1px solid #2a2a2a", background: "rgba(255,255,255,0.025)" }
                  }
                >
                  <div>
                    <p className={`text-sm font-semibold ${isSelected ? "text-orange-400" : "text-white"}`}>
                      {label}
                    </p>
                    <p className="text-xs text-[#606060] mt-0.5">{sublabel}</p>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ml-3 ${isSelected ? "text-orange-400" : "text-[#505050]"}`}>
                    {ACCOUNT_AGE_LIMITS[value]}/day
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Submit button — hidden once generation starts */}
        {genState === null && (
          <button
            type="submit"
            disabled={saving || !producerName.trim()}
            className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-br from-[#f97316] to-[#f85c00] hover:opacity-90 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 min-h-[44px]"
          >
            {saving ? "Saving..." : isEdit ? "Update my profile →" : "Save my profile →"}
          </button>
        )}

        {/* Upsell — free plan */}
        {genState?.status === "upsell" && (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-5">
            <p className="text-xs text-orange-400/70 font-semibold uppercase tracking-[0.1em] mb-2">Pro feature</p>
            <p className="text-sm font-semibold text-white mb-1">✦ AI DM Generation</p>
            <p className="text-sm text-[#a0a0a0] mb-4 leading-relaxed">
              Upgrade to Pro to automatically generate personalized DMs for your top contacts.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/pricing"
                className="flex-1 text-center text-sm font-semibold py-2.5 px-4 rounded-lg bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white hover:opacity-90 transition-opacity"
              >
                Upgrade to Pro →
              </Link>
              <Link
                href={isEdit ? "/dashboard" : "/artists"}
                className="flex-1 text-center text-sm font-semibold py-2.5 px-4 rounded-lg border border-white/[0.08] text-[#a0a0a0] hover:border-white/20 hover:text-white transition-colors"
              >
                Continue without →
              </Link>
            </div>
          </div>
        )}

        {/* Fetching contacts */}
        {genState?.status === "fetching" && (
          <div className="flex items-center gap-3 py-3">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-sm text-[#a0a0a0]">Profile saved. Preparing your contacts...</span>
          </div>
        )}

        {/* Generation progress */}
        {genState?.status === "generating" && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">
                Generating your DMs... {genState.current}/{genState.total}
              </p>
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            </div>
            <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{
                  width: `${genState.total > 0 ? Math.round((genState.current / genState.total) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-[#505050] mt-2">
              Do not close this page — generation is running.
            </p>
          </div>
        )}

        {/* Generation report */}
        {genState?.status === "done" && (
          <GenerationReport results={genState.results} />
        )}
      </form>

      {/* Social Links */}
      <section id="social-links" className="mt-12 pt-10 border-t border-white/[0.06]">
        <div className="mb-6">
          <h2 className="text-xl font-light tracking-[0.02em] text-white mb-1">Your Social Links</h2>
          <p className="text-sm text-[#606060]">
            Update your links anytime — they&apos;re used in your AI DM generation.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Instagram */}
          <SocialField
            label="Instagram"
            icon={<InstagramIcon />}
            value={socialLinks.instagram_url}
            onChange={(v) => setSocialLinks((s) => ({ ...s, instagram_url: v }))}
            placeholder="@yourusername"
            type="text"
          />
          {/* Beatstars */}
          <SocialField
            label="Beatstars"
            icon={<BeatstarsIcon />}
            value={socialLinks.beatstars_url}
            onChange={(v) => setSocialLinks((s) => ({ ...s, beatstars_url: v }))}
            placeholder="https://beatstars.com/yourname"
            type="url"
          />
          {/* SoundCloud */}
          <SocialField
            label="SoundCloud"
            icon={<SoundCloudIcon />}
            value={socialLinks.soundcloud_url}
            onChange={(v) => setSocialLinks((s) => ({ ...s, soundcloud_url: v }))}
            placeholder="https://soundcloud.com/yourname"
            type="url"
          />
          {/* YouTube */}
          <SocialField
            label="YouTube"
            icon={<YouTubeIcon />}
            value={socialLinks.youtube_url}
            onChange={(v) => setSocialLinks((s) => ({ ...s, youtube_url: v }))}
            placeholder="https://youtube.com/@yourname"
            type="url"
          />
          {/* Spotify */}
          <SocialField
            label="Spotify"
            icon={<SpotifyIcon />}
            value={socialLinks.spotify_url}
            onChange={(v) => setSocialLinks((s) => ({ ...s, spotify_url: v }))}
            placeholder="https://open.spotify.com/artist/..."
            type="url"
          />
        </div>

        <button
          type="button"
          onClick={handleSaveSocialLinks}
          disabled={savingSocial}
          className="mt-6 w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-br from-[#f97316] to-[#f85c00] hover:opacity-90 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 active:scale-95 min-h-[44px] text-sm"
        >
          {savingSocial ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              Saving...
            </span>
          ) : (
            "Save changes"
          )}
        </button>
      </section>
    </main>
  );
}
