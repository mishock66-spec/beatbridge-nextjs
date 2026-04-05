"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TOTAL_STEPS = 4;

type Fields = {
  instagram_url: string;
  beatstars_url: string;
  soundcloud_url: string;
  youtube_url: string;
  spotify_url: string;
};

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-[0.1em]">
          Step {step} of {TOTAL_STEPS}
        </p>
        <p className="text-xs text-[#505050]">{Math.round((step / TOTAL_STEPS) * 100)}%</p>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-[#f85c00] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function SocialOnboardingClient() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1-indexed
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Fields>({
    instagram_url: "",
    beatstars_url: "",
    soundcloud_url: "",
    youtube_url: "",
    spotify_url: "",
  });

  // Redirect unsigned users
  if (isLoaded && !isSignedIn) {
    router.replace("/sign-in?redirect_url=/onboarding/social");
    return null;
  }

  const userId = user?.id;

  async function saveFields(partialFields: Partial<Fields>) {
    if (!userId || !supabase) return;
    await supabase
      .from("user_profiles")
      .upsert(
        { user_id: userId, ...partialFields, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      )
      .catch(() => {});
  }

  async function finish() {
    if (!userId || !supabase) return;
    await supabase
      .from("user_profiles")
      .upsert(
        { user_id: userId, onboarding_completed: true, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      )
      .catch(() => {});
    router.replace("/dashboard");
  }

  async function handleContinue(savedFields?: Partial<Fields>) {
    setSaving(true);
    if (savedFields) await saveFields(savedFields);
    setSaving(false);
    if (step >= TOTAL_STEPS) {
      await finish();
    } else {
      setStep((s) => s + 1);
    }
  }

  async function handleSkip() {
    if (step >= TOTAL_STEPS) {
      setSaving(true);
      await finish();
      setSaving(false);
    } else {
      setStep((s) => s + 1);
    }
  }

  const isLastStep = step === TOTAL_STEPS;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-xl font-semibold tracking-tight">
            Beat<span className="text-orange-500">Bridge</span>
          </span>
        </div>

        <ProgressBar step={step} />

        {/* Sliding container */}
        <div className="overflow-hidden w-full">
          <div
            className="flex transition-transform duration-350 ease-in-out"
            style={{
              width: `${TOTAL_STEPS * 100}%`,
              transform: `translateX(-${((step - 1) / TOTAL_STEPS) * 100}%)`,
            }}
          >
            {/* Step 1 — Instagram */}
            <div className="w-full px-px" style={{ width: `${100 / TOTAL_STEPS}%` }}>
              <StepShell
                title="What's your Instagram?"
                subtitle="This is how contacts will find you when you DM them."
                onContinue={() =>
                  handleContinue(
                    fields.instagram_url.trim()
                      ? { instagram_url: fields.instagram_url.trim() }
                      : undefined
                  )
                }
                onSkip={handleSkip}
                saving={saving}
                isLastStep={false}
              >
                <input
                  type="text"
                  value={fields.instagram_url}
                  onChange={(e) => setFields((f) => ({ ...f, instagram_url: e.target.value }))}
                  placeholder="@yourusername"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm min-h-[44px]"
                  autoComplete="off"
                  spellCheck={false}
                />
              </StepShell>
            </div>

            {/* Step 2 — Beats platform */}
            <div className="w-full px-px" style={{ width: `${100 / TOTAL_STEPS}%` }}>
              <StepShell
                title="Where do you sell your beats?"
                subtitle="Add your Beatstars or Airbit link so contacts can hear your work."
                onContinue={() =>
                  handleContinue(
                    fields.beatstars_url.trim()
                      ? { beatstars_url: fields.beatstars_url.trim() }
                      : undefined
                  )
                }
                onSkip={handleSkip}
                saving={saving}
                isLastStep={false}
              >
                <input
                  type="url"
                  value={fields.beatstars_url}
                  onChange={(e) => setFields((f) => ({ ...f, beatstars_url: e.target.value }))}
                  placeholder="https://beatstars.com/yourname"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm min-h-[44px]"
                  autoComplete="url"
                />
              </StepShell>
            </div>

            {/* Step 3 — SoundCloud / YouTube */}
            <div className="w-full px-px" style={{ width: `${100 / TOTAL_STEPS}%` }}>
              <StepShell
                title="Do you have a SoundCloud or YouTube?"
                subtitle="Optional — helps contacts check your catalog."
                onContinue={() =>
                  handleContinue({
                    ...(fields.soundcloud_url.trim() && { soundcloud_url: fields.soundcloud_url.trim() }),
                    ...(fields.youtube_url.trim() && { youtube_url: fields.youtube_url.trim() }),
                  })
                }
                onSkip={handleSkip}
                saving={saving}
                isLastStep={false}
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url"
                    value={fields.soundcloud_url}
                    onChange={(e) => setFields((f) => ({ ...f, soundcloud_url: e.target.value }))}
                    placeholder="https://soundcloud.com/yourname"
                    className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm min-h-[44px]"
                    autoComplete="url"
                  />
                  <input
                    type="url"
                    value={fields.youtube_url}
                    onChange={(e) => setFields((f) => ({ ...f, youtube_url: e.target.value }))}
                    placeholder="https://youtube.com/@yourname"
                    className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm min-h-[44px]"
                    autoComplete="url"
                  />
                </div>
              </StepShell>
            </div>

            {/* Step 4 — Spotify */}
            <div className="w-full px-px" style={{ width: `${100 / TOTAL_STEPS}%` }}>
              <StepShell
                title="Are you on Spotify?"
                subtitle="Add your artist profile if you release music."
                onContinue={() =>
                  handleContinue(
                    fields.spotify_url.trim()
                      ? { spotify_url: fields.spotify_url.trim() }
                      : undefined
                  )
                }
                onSkip={handleSkip}
                saving={saving}
                isLastStep={true}
              >
                <input
                  type="url"
                  value={fields.spotify_url}
                  onChange={(e) => setFields((f) => ({ ...f, spotify_url: e.target.value }))}
                  placeholder="https://open.spotify.com/artist/..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 text-sm min-h-[44px]"
                  autoComplete="url"
                />
              </StepShell>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── StepShell ────────────────────────────────────────────────────────────────

function StepShell({
  title,
  subtitle,
  children,
  onContinue,
  onSkip,
  saving,
  isLastStep,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onContinue: () => void;
  onSkip: () => void;
  saving: boolean;
  isLastStep: boolean;
}) {
  return (
    <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-7">
      <h2 className="text-2xl font-light tracking-[0.02em] text-white mb-2">{title}</h2>
      <p className="text-sm text-[#606060] mb-6 leading-relaxed">{subtitle}</p>

      <div className="mb-7">{children}</div>

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onClick={onSkip}
          disabled={saving}
          className="flex-1 py-3 rounded-lg text-sm font-medium text-[#606060] hover:text-[#a0a0a0] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 min-h-[44px] disabled:opacity-40"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={saving}
          className="flex-1 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-br from-[#f97316] to-[#f85c00] hover:opacity-90 hover:scale-[1.02] transition-all duration-200 min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              Saving...
            </span>
          ) : isLastStep ? (
            "Finish →"
          ) : (
            "Continue →"
          )}
        </button>
      </div>
    </div>
  );
}
