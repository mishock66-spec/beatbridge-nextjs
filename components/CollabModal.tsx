"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

type Member = {
  user_id: string;
  producer_name: string;
  beatstars_url?: string | null;
  soundcloud_url?: string | null;
};

type Props = {
  receiver: Member;
  senderProfile: {
    producer_name: string;
    beatstars_url?: string | null;
    soundcloud_url?: string | null;
  };
  onClose: () => void;
  onSent: () => void;
};

const INTENT_OPTIONS = [
  { value: "Looking for a rapper/vocalist", label: "🎤 Looking for a rapper/vocalist" },
  { value: "Looking for a sound engineer", label: "🎛️ Looking for a sound engineer" },
  { value: "Open collab (beat swap)", label: "🤝 Open collab (beat swap)" },
  { value: "Looking for feedback on my beats", label: "👂 Looking for feedback on my beats" },
  { value: "Other", label: "💼 Other" },
];

export default function CollabModal({ receiver, senderProfile, onClose, onSent }: Props) {
  const { user } = useUser();

  const senderBeats = senderProfile.beatstars_url || senderProfile.soundcloud_url || "";
  const defaultMsg = `Hey ${receiver.producer_name}, I'm ${senderProfile.producer_name}, a beatmaker on BeatBridge. I'd love to connect and potentially work together.`;

  const [message, setMessage] = useState(defaultMsg);
  const [beatsLink, setBeatsLink] = useState(senderBeats);
  const [intent, setIntent] = useState(INTENT_OPTIONS[0].value);
  const [intentOpen, setIntentOpen] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "sending" | "done">("form");
  const [error, setError] = useState("");
  const intentRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (intentRef.current && !intentRef.current.contains(e.target as Node)) {
        setIntentOpen(false);
      }
    }
    if (intentOpen) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [intentOpen]);

  // Close modal on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  async function handleSend() {
    if (!user?.id) return;
    setStep("sending");
    setError("");
    try {
      const res = await fetch("/api/collab/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: receiver.user_id,
          message,
          beats_link: beatsLink,
          intent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setStep("done");
      setTimeout(() => onSent(), 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("confirm");
    }
  }

  const selectedLabel = INTENT_OPTIONS.find((o) => o.value === intent)?.label ?? intent;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-[#0f0f0f] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <p className="text-xs text-[#505050] uppercase tracking-[0.1em] font-medium mb-0.5">Collab Request</p>
            <h2 className="text-white font-semibold text-base leading-tight">
              Send a collab request to {receiver.producer_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#505050] hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* Done state */}
          {step === "done" && (
            <div className="py-8 text-center">
              <div className="text-4xl mb-3">🤝</div>
              <p className="text-white font-semibold text-lg mb-1">Request sent!</p>
              <p className="text-[#a0a0a0] text-sm">
                {receiver.producer_name} will be notified.
              </p>
            </div>
          )}

          {/* Confirm step */}
          {step === "confirm" && (
            <div className="py-4">
              <p className="text-white font-medium mb-2">
                Send this collab request to {receiver.producer_name}?
              </p>
              <p className="text-[#a0a0a0] text-sm mb-6 leading-relaxed">
                They&apos;ll receive a message in their inbox and an email notification.
              </p>
              {error && (
                <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-[#a0a0a0] bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-br from-[#f97316] to-[#f85c00] hover:opacity-90 rounded-lg transition-opacity"
                >
                  Yes, send →
                </button>
              </div>
            </div>
          )}

          {/* Sending state */}
          {step === "sending" && (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[#a0a0a0] text-sm">Sending request...</p>
            </div>
          )}

          {/* Form */}
          {step === "form" && (
            <div className="flex flex-col gap-4">
              {/* Message */}
              <div>
                <label className="block text-xs text-[#505050] uppercase tracking-[0.08em] font-medium mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#404040] resize-none focus:outline-none focus:border-orange-500/50 transition-colors"
                  style={{ minHeight: 44 }}
                />
              </div>

              {/* Beats link */}
              <div>
                <label className="block text-xs text-[#505050] uppercase tracking-[0.08em] font-medium mb-2">
                  Share your beats link
                </label>
                <input
                  type="url"
                  value={beatsLink}
                  onChange={(e) => setBeatsLink(e.target.value)}
                  placeholder="https://beatstars.com/yourname"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 transition-colors"
                  style={{ minHeight: 44 }}
                />
              </div>

              {/* Intent dropdown */}
              <div>
                <label className="block text-xs text-[#505050] uppercase tracking-[0.08em] font-medium mb-2">
                  What are you looking for?
                </label>
                <div ref={intentRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIntentOpen((o) => !o)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white text-left flex items-center justify-between focus:outline-none focus:border-orange-500/50 transition-colors hover:border-white/[0.14]"
                    style={{ minHeight: 44 }}
                  >
                    <span>{selectedLabel}</span>
                    <svg
                      className={`w-4 h-4 text-[#505050] transition-transform duration-150 flex-shrink-0 ml-2 ${intentOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {intentOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#111111] border border-white/[0.1] rounded-xl overflow-hidden shadow-xl shadow-black/50 z-20">
                      {INTENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setIntent(opt.value); setIntentOpen(false); }}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-white/[0.06] ${
                            intent === opt.value
                              ? "text-orange-400 bg-orange-500/[0.06]"
                              : "text-[#a0a0a0]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-[#a0a0a0] bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  disabled={!message.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-br from-[#f97316] to-[#f85c00] hover:opacity-90 rounded-lg transition-opacity disabled:opacity-40"
                >
                  Send Request →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
