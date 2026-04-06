"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import Avatar from "@/components/Avatar";
import CollabModal from "@/components/CollabModal";

export const dynamic = "force-dynamic";

type Member = {
  user_id: string;
  producer_name: string;
  instagram_url?: string | null;
  beatstars_url?: string | null;
  soundcloud_url?: string | null;
  avatar_url?: string | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function instagramHandle(url?: string | null): string | null {
  if (!url) return null;
  const clean = url.replace(/\/$/, "");
  const parts = clean.split("/");
  const handle = parts[parts.length - 1].replace("@", "");
  return handle || null;
}

function beatsUrl(member: Member): string | null {
  return member.beatstars_url || member.soundcloud_url || null;
}

// Placeholder cards for logged-out blur effect
const PLACEHOLDER_CARDS = [
  { id: "1", name: "Producer X", ig: "@producerx" },
  { id: "2", name: "BeatMaker99", ig: "@beatmaker99" },
  { id: "3", name: "LoFiKing", ig: "@lofiking" },
  { id: "4", name: "TrapWizard", ig: "@trapwizard" },
  { id: "5", name: "SoundEngineer", ig: "@soundengineer" },
  { id: "6", name: "DrillProducer", ig: "@drillproducer" },
];

export default function CommunityPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedReceiver, setSelectedReceiver] = useState<Member | null>(null);
  const [senderProfile, setSenderProfile] = useState<{
    producer_name: string;
    beatstars_url?: string | null;
    soundcloud_url?: string | null;
  } | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const fetchMembers = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, producer_name, instagram_url, beatstars_url, soundcloud_url")
        .eq("onboarding_completed", true)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      else setMembers((data ?? []).filter((m) => m.user_id !== user?.id));
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user?.id]);

  const fetchSenderProfile = useCallback(async () => {
    if (!user?.id) return;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase
      .from("user_profiles")
      .select("producer_name, beatstars_url, soundcloud_url")
      .eq("user_id", user.id)
      .single();
    if (!error && data) setSenderProfile(data);
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      fetchMembers();
      fetchSenderProfile();
    }
  }, [isLoaded, isSignedIn, fetchMembers, fetchSenderProfile]);

  const filtered = members.filter((m) =>
    m.producer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSent = (receiverId: string) => {
    setSentTo((prev) => new Set(Array.from(prev).concat([receiverId])));
    setSelectedReceiver(null);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">

        {/* Page header */}
        <div className="mb-8 sm:mb-10">
          <p className="text-xs text-[#505050] uppercase tracking-[0.1em] font-medium mb-2">BeatBridge</p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-[0.02em] text-white mb-2">Community</h1>
          <p className="text-[#a0a0a0] text-sm">
            Connect with beatmakers and producers. Send a collab request to get the conversation started.
          </p>
        </div>

        {/* Logged-in: search + grid */}
        {isSignedIn ? (
          <>
            {/* Search bar */}
            <div className="mb-6 relative max-w-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#505050]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search producers..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/40 transition-colors"
              />
            </div>

            {/* Members grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-44 bg-white/[0.025] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl px-6 py-16 text-center">
                <div className="text-3xl mb-3">🎹</div>
                <p className="text-[#a0a0a0] text-sm font-medium">
                  {search ? "No producers match your search." : "No producers here yet — check back soon."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((member) => {
                  const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${member.user_id}.jpg`;
                  const igHandle = instagramHandle(member.instagram_url);
                  const beats = beatsUrl(member);
                  const alreadySent = sentTo.has(member.user_id);

                  return (
                    <div
                      key={member.user_id}
                      className="bg-white/[0.025] backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4 hover:border-white/[0.15] transition-all duration-200"
                    >
                      {/* Top row: avatar + name */}
                      <div className="flex items-center gap-3">
                        <Avatar
                          url={avatarUrl}
                          username={member.producer_name || "?"}
                          size={44}
                        />
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm truncate">
                            {member.producer_name || "Unknown"}
                          </p>
                          {igHandle && (
                            <a
                              href={member.instagram_url ?? `https://instagram.com/${igHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#a0a0a0] hover:text-orange-400 transition-colors truncate block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              @{igHandle}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Beats link */}
                      {beats ? (
                        <a
                          href={beats}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#a0a0a0] hover:text-orange-400 transition-colors flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>🎵</span>
                          <span className="truncate">Hear my beats</span>
                        </a>
                      ) : (
                        <div className="text-xs text-[#404040] flex items-center gap-1.5">
                          <span>🎵</span>
                          <span>No beats link</span>
                        </div>
                      )}

                      {/* CTA button */}
                      <button
                        onClick={() => setSelectedReceiver(member)}
                        disabled={alreadySent}
                        className={`w-full py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                          alreadySent
                            ? "bg-green-500/10 border border-green-500/20 text-green-400 cursor-default"
                            : "bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white hover:opacity-90 hover:scale-[1.02]"
                        }`}
                      >
                        {alreadySent ? "✓ Request sent" : "Send Collab Request"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Telegram secondary CTA */}
            <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
              <p className="text-[#505050] text-sm mb-3">Also part of our group chat?</p>
              <a
                href="https://t.me/+H5L7HpvQtUdlYWFk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#a0a0a0] hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
                </svg>
                Join our Telegram community →
              </a>
            </div>
          </>
        ) : (
          /* Logged-out: blurred placeholder grid + CTA */
          <div className="relative">
            {/* Blurred placeholder cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pointer-events-none select-none">
              {PLACEHOLDER_CARDS.map((p) => (
                <div
                  key={p.id}
                  className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4"
                  style={{ filter: "blur(6px)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 font-semibold text-sm">
                      {p.name[0]}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-[#a0a0a0]">{p.ig}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#a0a0a0]">🎵 Hear my beats</p>
                  <div className="w-full py-2 text-xs font-semibold rounded-lg bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white text-center">
                    Send Collab Request
                  </div>
                </div>
              ))}
            </div>

            {/* Overlay CTA */}
            <div
              className="absolute inset-0 flex items-center justify-center rounded-2xl"
              style={{ background: "rgba(8,8,8,0.6)", backdropFilter: "blur(2px)" }}
            >
              <div className="text-center px-6 py-10 bg-white/[0.03] border border-white/[0.08] rounded-2xl max-w-sm w-full mx-4">
                <div className="text-4xl mb-4">🤝</div>
                <h2 className="text-white font-semibold text-lg mb-2">
                  Connect with producers
                </h2>
                <p className="text-[#a0a0a0] text-sm mb-6 leading-relaxed">
                  Join BeatBridge to connect with producers, send collab requests, and grow your network.
                </p>
                <SignInButton>
                  <button className="w-full py-2.5 text-sm font-semibold bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white rounded-lg hover:opacity-90 transition-opacity">
                    Sign in to join →
                  </button>
                </SignInButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collab modal */}
      {selectedReceiver && senderProfile && (
        <CollabModal
          receiver={selectedReceiver}
          senderProfile={senderProfile}
          onClose={() => setSelectedReceiver(null)}
          onSent={() => handleSent(selectedReceiver.user_id)}
        />
      )}
    </div>
  );
}
