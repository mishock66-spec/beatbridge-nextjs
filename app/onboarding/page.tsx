"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_AGE_LIMITS, type AccountAge } from "@/lib/dmLimits";

const BEAT_STYLES = ["Trap", "Boom-Bap", "Drill", "Lo-fi", "R&B", "Afrobeats", "Pop", "Other"];
const GOALS = ["Beat placements", "Collabs", "Sync licensing", "Label deal", "Management"];

const ACCOUNT_AGE_OPTIONS: { value: AccountAge; label: string; sublabel: string }[] = [
  { value: "new",         label: "New account",         sublabel: "Less than 1 month old" },
  { value: "growing",     label: "Growing account",     sublabel: "1 to 6 months old" },
  { value: "established", label: "Established account", sublabel: "More than 6 months old" },
];

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

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    async function checkProfile() {
      if (!supabase || !user) {
        setChecking(false);
        return;
      }
      const { data } = await supabase
        .from("user_profiles")
        .select("id, producer_name, beat_styles, influences, goals, bio, instagram_account_age")
        .eq("user_id", user.id)
        .single();
      if (data) {
        // Profile exists — pre-fill for editing
        setProducerName(data.producer_name || "");
        setBeatStyles(data.beat_styles || []);
        setInfluences(data.influences || "");
        setGoals(data.goals || []);
        setBio(data.bio || "");
        if (data.instagram_account_age) {
          setInstagramAccountAge(data.instagram_account_age as AccountAge);
        }
        setIsEdit(true);
      }
      setChecking(false);
    }
    checkProfile();
  }, [isLoaded, isSignedIn, user, router]);

  function togglePill(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !supabase) return;
    setSaving(true);
    setError("");
    try {
      const { error: err } = await supabase.from("user_profiles").upsert(
        {
          user_id: user.id,
          producer_name: producerName.trim(),
          beat_styles: beatStyles,
          influences: influences.trim(),
          goals,
          bio: bio.trim(),
          instagram_account_age: instagramAccountAge,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (err) throw err;
      router.push(isEdit ? "/dashboard" : "/artists");
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  if (!isLoaded || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm min-h-[44px]"
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
                onClick={() => togglePill(beatStyles, setBeatStyles, style)}
                className={`text-sm px-4 py-2 rounded-lg border transition-all duration-200 min-h-[44px] ${
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
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm min-h-[44px]"
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
                onClick={() => togglePill(goals, setGoals, goal)}
                className={`text-sm px-4 py-2 rounded-lg border transition-all duration-200 min-h-[44px] ${
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
            placeholder="Your background, journey, what you're working on..."
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm resize-none"
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
            {ACCOUNT_AGE_OPTIONS.map(({ value, label, sublabel }) => (
              <button
                key={value}
                type="button"
                onClick={() => setInstagramAccountAge(value)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 text-left min-h-[44px] ${
                  instagramAccountAge === value
                    ? "bg-orange-500/20 border-orange-500/60 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                    : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                }`}
              >
                <div>
                  <p className={`text-sm font-semibold ${instagramAccountAge === value ? "text-orange-400" : "text-white"}`}>
                    {label}
                  </p>
                  <p className="text-xs text-[#606060] mt-0.5">{sublabel}</p>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ml-3 ${instagramAccountAge === value ? "text-orange-400" : "text-[#505050]"}`}>
                  {ACCOUNT_AGE_LIMITS[value]}/day
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving || !producerName.trim()}
          className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-br from-[#f97316] to-[#f85c00] hover:opacity-90 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 min-h-[44px]"
        >
          {saving ? "Saving..." : isEdit ? "Update my profile →" : "Save my profile →"}
        </button>
      </form>
    </main>
  );
}
