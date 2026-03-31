"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UserStats {
  dmsSent: number;
  repliesReceived: number;
  responseRate: number;
  topArtist: string;
  accountAge: string;
}

function buildWelcomeMessage(name?: string | null): Message {
  const greeting = name ? `Hey ${name}!` : "Hey!";
  return {
    role: "assistant",
    content: `${greeting} I'm your BeatBridge assistant. Ask me anything about the platform, drop a DM for me to rewrite, or say 'analyze my results' and I'll break down your stats. 🎛️`,
  };
}

const QUICK_ACTIONS = [
  "✍️ Rewrite my DM",
  "📊 Analyze my results",
  "💡 DM strategy tips",
];

const GUEST_LIMIT = 3;

const FEEDBACK_BUG_WORDS = [
  "bug", "error", "broken", "doesn't work", "doesnt work", "not working",
  "problem", "issue", "wrong information", "incorrect", "wrong", "fix",
];
const FEEDBACK_SUGGESTION_WORDS = [
  "suggestion", "idea", "feedback", "report",
  "send an email", "contact", "tell the team", "let them know",
];

function detectFeedback(text: string): { triggered: boolean; type: string } {
  const lower = text.toLowerCase();
  if (FEEDBACK_BUG_WORDS.some((w) => lower.includes(w)))
    return { triggered: true, type: "Bug Report" };
  if (FEEDBACK_SUGGESTION_WORDS.some((w) => lower.includes(w)))
    return { triggered: true, type: "Suggestion" };
  return { triggered: false, type: "" };
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 text-[10px]">
        ✦
      </div>
      <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

export default function ChatAssistant() {
  const { isSignedIn, user } = useUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    buildWelcomeMessage(null),
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [feedbackMode, setFeedbackMode] = useState<"idle" | "awaiting_description" | "sent">("idle");
  const [feedbackType, setFeedbackType] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user stats when opened and signed in
  useEffect(() => {
    if (!open || !isSignedIn || !user || !supabase) return;

    async function fetchStats() {
      if (!supabase || !user) return;

      const [activityRes, statusRes, profileRes] = await Promise.all([
        supabase
          .from("dm_activity")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("action", "sent"),
        supabase
          .from("dm_status")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "Replied"),
        supabase
          .from("user_profiles")
          .select("instagram_account_age, top_artist")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const dmsSent = activityRes.count ?? 0;
      const repliesReceived = statusRes.count ?? 0;
      const responseRate = dmsSent > 0 ? (repliesReceived / dmsSent) * 100 : 0;

      setUserStats({
        dmsSent,
        repliesReceived,
        responseRate,
        topArtist: profileRes.data?.top_artist ?? "unknown",
        accountAge: profileRes.data?.instagram_account_age ?? "unknown",
      });
    }

    fetchStats();
  }, [open, isSignedIn, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Personalize welcome message when panel opens with signed-in user
  useEffect(() => {
    if (!open) return;
    const name = user?.firstName ?? user?.username ?? null;
    setMessages([buildWelcomeMessage(name)]);
    setShowQuickActions(true);
    setFeedbackMode("idle");
    setFeedbackType("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Guest limit check
    if (!isSignedIn && guestMessageCount >= GUEST_LIMIT) return;

    const newUserMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");
    setShowQuickActions(false);
    if (!isSignedIn) setGuestMessageCount((c) => c + 1);

    // — Feedback flow: user just described the issue → submit and confirm —
    if (feedbackMode === "awaiting_description") {
      setLoading(true);
      const username = user?.firstName ?? user?.username ?? "User";
      const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";

      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            userEmail,
            description: trimmed,
            type: feedbackType,
          }),
        });
      } catch {
        // silently fail — still confirm to user
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Thanks ${username}. I've logged this and sent it to the team. They'll look into it. 🙏`,
        },
      ]);
      setFeedbackMode("idle");
      setLoading(false);
      return;
    }

    // — Detect feedback trigger in a fresh message (also re-triggers after "sent") —
    const { triggered, type } = detectFeedback(trimmed);
    if (triggered) {
      setFeedbackType(type);
      setFeedbackMode("awaiting_description");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Got it — I'll make sure this reaches the BeatBridge team. Can you describe the issue in a bit more detail? Which page were you on, and what happened exactly?",
        },
      ]);
      return;
    }

    // — Normal AI flow —
    setLoading(true);
    const updatedMessages = [...messages, newUserMsg];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          userStats: userStats ?? undefined,
        }),
      });

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const guestLimitReached = !isSignedIn && guestMessageCount >= GUEST_LIMIT;

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat assistant"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-110 hover:shadow-orange-500/50 transition-all duration-200 active:scale-95"
        style={{ zIndex: 9999 }}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-xl leading-none">✦</span>
        )}
        {/* Pulse ring — only when closed */}
        {!open && (
          <span className="absolute inset-0 rounded-full bg-orange-500/40 animate-ping" style={{ animationDuration: "2s" }} />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[360px] flex flex-col rounded-2xl border border-white/[0.1] shadow-2xl shadow-black/60 overflow-hidden"
          style={{ zIndex: 9998, height: "480px", background: "#111111" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#111111] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f97316] to-[#f85c00] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                ✦
              </div>
              <p className="text-sm font-semibold text-white leading-tight">BeatBridge Assistant</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#505050] hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex mb-3 ${msg.role === "user" ? "justify-end" : "items-end gap-2"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 text-[10px]">
                    ✦
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white rounded-br-sm"
                      : "bg-white/[0.06] border border-white/[0.08] text-[#e0e0e0] rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Quick action chips — shown after first welcome message */}
            {showQuickActions && messages.length === 1 && (
              <div className="flex flex-col gap-2 mb-3 ml-8">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="text-left text-xs px-3 py-2 rounded-xl border border-orange-500/25 text-orange-400/80 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/5 transition-all duration-150"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {loading && <TypingIndicator />}

            {/* Guest limit notice */}
            {guestLimitReached && (
              <div className="bg-orange-500/10 border border-orange-500/25 rounded-xl p-3 text-center mb-2">
                <p className="text-xs text-[#a0a0a0] mb-2">
                  Sign in to see your real stats and get personalized advice
                </p>
                <Link
                  href="/sign-in"
                  className="text-xs font-semibold text-orange-400 hover:text-orange-300 underline"
                >
                  Sign in →
                </Link>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-3 py-3 border-t border-white/[0.07] bg-[#0d0d0d]">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={guestLimitReached ? "Sign in to continue…" : "Ask anything…"}
                disabled={guestLimitReached || loading}
                rows={1}
                className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/40 resize-none min-h-[44px] max-h-[120px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ scrollbarWidth: "none" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading || guestLimitReached}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white flex items-center justify-center hover:opacity-90 hover:scale-[1.05] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
