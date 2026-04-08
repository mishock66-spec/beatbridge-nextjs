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

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  messages: Message[];
}

function buildWelcomeMessage(name?: string | null): Message {
  const greeting = name ? `Hey ${name}!` : "Hey!";
  return {
    role: "assistant",
    content: `${greeting} I'm your BeatBridge assistant. Ask me anything about the platform, drop a DM for me to rewrite, or say 'analyze my results' and I'll break down your stats. 🎛️`,
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f97316] to-[#f85c00] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-512.png" alt="BeatBridge" className="w-4 h-4 rounded-full object-cover" />
      </div>
      <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

export default function ChatAssistant() {
  const { isSignedIn, user } = useUser();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [messages, setMessages] = useState<Message[]>(() => [buildWelcomeMessage(null)]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<Conversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const feedbackModeRef = useRef(false);
  const [feedbackType, setFeedbackType] = useState("");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user stats when opened and signed in
  useEffect(() => {
    if (!open || !isSignedIn || !user || !supabase) return;

    async function fetchStats() {
      if (!supabase || !user) return;
      const [activityRes, statusRes, profileRes] = await Promise.all([
        supabase.from("dm_activity").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("action", "sent"),
        supabase.from("dm_status").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "Replied"),
        supabase.from("user_profiles").select("instagram_account_age, top_artist").eq("user_id", user.id).maybeSingle(),
      ]);
      const dmsSent = activityRes.count ?? 0;
      const repliesReceived = statusRes.count ?? 0;
      setUserStats({
        dmsSent,
        repliesReceived,
        responseRate: dmsSent > 0 ? (repliesReceived / dmsSent) * 100 : 0,
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

  // On open: load last conversation (signed in) or reset to welcome (guest)
  useEffect(() => {
    if (!open) return;
    feedbackModeRef.current = false;
    setFeedbackMode(false);
    setFeedbackType("");
    setView("chat");

    if (!isSignedIn || !user) {
      const name = user?.firstName ?? user?.username ?? null;
      setMessages([buildWelcomeMessage(name)]);
      setShowQuickActions(true);
      setConversationId(null);
      return;
    }

    const userId = user.id;
    fetch(`/api/chat/history?userId=${encodeURIComponent(userId)}&limit=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.conversations?.length > 0) {
          const last: Conversation = data.conversations[0];
          setMessages(last.messages);
          setConversationId(last.id);
          setShowQuickActions(false);
        } else {
          const name = user.firstName ?? user.username ?? null;
          setMessages([buildWelcomeMessage(name)]);
          setShowQuickActions(true);
          setConversationId(null);
        }
      })
      .catch(() => {
        const name = user?.firstName ?? user?.username ?? null;
        setMessages([buildWelcomeMessage(name)]);
        setShowQuickActions(true);
        setConversationId(null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus input when panel opens (chat view)
  useEffect(() => {
    if (open && view === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, view]);

  async function loadHistory() {
    if (!isSignedIn || !user) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/chat/history?userId=${encodeURIComponent(user.id)}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.conversations ?? []);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  function openHistory() {
    setView("history");
    loadHistory();
  }

  function startNewChat() {
    const name = user?.firstName ?? user?.username ?? null;
    setMessages([buildWelcomeMessage(name)]);
    setConversationId(null);
    setShowQuickActions(true);
    feedbackModeRef.current = false;
    setFeedbackMode(false);
    setFeedbackType("");
    setInput("");
    setView("chat");
  }

  function loadConversation(conv: Conversation) {
    setMessages(conv.messages);
    setConversationId(conv.id);
    setShowQuickActions(false);
    feedbackModeRef.current = false;
    setFeedbackMode(false);
    setFeedbackType("");
    setInput("");
    setView("chat");
  }

  async function deleteConversation(convId: string) {
    if (!user || !confirm("Delete this conversation?")) return;
    setDeletingConvId(convId);
    try {
      await fetch(`/api/chat/history/${convId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      setHistoryList((prev) => prev.filter((c) => c.id !== convId));
      if (convId === conversationId) {
        startNewChat();
      }
    } finally {
      setDeletingConvId(null);
    }
  }

  async function persistMessages(finalMessages: Message[], convId: string | null): Promise<string | null> {
    if (!isSignedIn || !user) return null;
    const userMsgs = finalMessages.filter((m) => m.role === "user");
    if (userMsgs.length === 0) return null;
    const title = userMsgs[0].content.slice(0, 50);
    try {
      const res = await fetch("/api/chat/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, conversation_id: convId, messages: finalMessages, title }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.id ?? null;
    } catch {
      return null;
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (!isSignedIn && guestMessageCount >= GUEST_LIMIT) return;

    const newUserMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");
    setShowQuickActions(false);
    if (!isSignedIn) setGuestMessageCount((c) => c + 1);

    // Feedback flow
    if (feedbackModeRef.current) {
      setLoading(true);
      const username = user?.firstName ?? user?.username ?? "User";
      const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";
      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, userEmail, description: trimmed, type: feedbackType }),
        });
      } catch {
        // ignore
      }
      feedbackModeRef.current = false;
      setFeedbackMode(false);
      const confirmMsg: Message = { role: "assistant", content: `Done — sent to the team! 🙏` };
      const feedbackFinalMessages = [...messages, newUserMsg, confirmMsg];
      setMessages((prev) => [...prev, confirmMsg]);
      persistMessages(feedbackFinalMessages, conversationId).then((id) => {
        if (id && !conversationId) setConversationId(id);
      });
      setLoading(false);
      return;
    }

    // Detect feedback trigger
    const { triggered, type } = detectFeedback(trimmed);
    if (triggered) {
      setFeedbackType(type);
      feedbackModeRef.current = true;
      setFeedbackMode(true);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Got it — describe the issue and I'll send it directly to the BeatBridge team right now." },
      ]);
      return;
    }

    // Normal AI flow
    setLoading(true);
    const updatedMessages = [...messages, newUserMsg];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, userStats: userStats ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[chat] API error:", data?.error ?? res.status);
        throw new Error(data?.error ?? "Request failed");
      }

      const assistantMsg: Message = { role: "assistant", content: data.reply };
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      // Persist to Supabase (fire and forget, capture new conversationId)
      persistMessages(finalMessages, conversationId).then((id) => {
        if (id && !conversationId) setConversationId(id);
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Try again in a moment." },
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
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/icons/icon-512.png" alt="BeatBridge" className="w-8 h-8 rounded-full object-cover" />
        )}
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
            {view === "history" ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView("chat")}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#505050] hover:text-white hover:bg-white/[0.06] transition-colors"
                    aria-label="Back to chat"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <p className="text-sm font-semibold text-white">Chat History</p>
                </div>
                <button
                  onClick={startNewChat}
                  className="flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-orange-500/10"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New chat
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f97316] to-[#f85c00] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/icon-512.png" alt="BeatBridge" className="w-5 h-5 rounded-full object-cover" />
                  </div>
                  <p className="text-sm font-semibold text-white leading-tight">BeatBridge Assistant</p>
                </div>
                <div className="flex items-center gap-1">
                  {isSignedIn && (
                    <button
                      onClick={openHistory}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[#505050] hover:text-white hover:bg-white/[0.06] transition-colors"
                      title="Chat history"
                      aria-label="Chat history"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#505050] hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* History view */}
          {view === "history" && (
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
              {historyLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : historyList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#505050]">No previous conversations.</p>
                  <p className="text-xs text-[#404040]">Start chatting to save your history.</p>
                  <button
                    onClick={startNewChat}
                    className="mt-1 text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Start chatting →
                  </button>
                </div>
              ) : (
                <div className="p-2">
                  {historyList.map((conv) => (
                    <div
                      key={conv.id}
                      className="group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                      onClick={() => loadConversation(conv)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate leading-snug ${conv.id === conversationId ? "text-orange-400 font-medium" : "text-[#d0d0d0]"}`}>
                          {conv.title || "Untitled conversation"}
                        </p>
                        <p className="text-xs text-[#505050] mt-0.5">{formatDate(conv.updated_at)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                        disabled={deletingConvId === conv.id}
                        className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-[#404040] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                        aria-label="Delete conversation"
                      >
                        {deletingConvId === conv.id ? (
                          <span className="w-3 h-3 block border border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat view */}
          {view === "chat" && (
            <>
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

                {/* Quick action chips */}
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

                {loading && <TypingIndicator />}

                {/* Guest limit notice */}
                {guestLimitReached && (
                  <div className="bg-orange-500/10 border border-orange-500/25 rounded-xl p-3 text-center mb-2">
                    <p className="text-xs text-[#a0a0a0] mb-2">
                      Sign in to see your real stats and get personalized advice
                    </p>
                    <Link href="/sign-in" className="text-xs font-semibold text-orange-400 hover:text-orange-300 underline">
                      Sign in →
                    </Link>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 px-3 py-3 border-t border-white/[0.07] bg-[#0d0d0d]">
                {showFeedbackForm ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Describe the issue or suggestion…"
                      rows={3}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/40 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!feedbackText.trim() || feedbackSubmitting) return;
                          setFeedbackSubmitting(true);
                          try {
                            const res = await fetch("/api/feedback", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                username: user?.username || user?.firstName || "Anonymous",
                                userEmail: user?.emailAddresses?.[0]?.emailAddress ?? "",
                                description: feedbackText.trim(),
                                type: "feedback",
                              }),
                            });
                            setMessages((prev) => [
                              ...prev,
                              { role: "assistant", content: res.ok ? "✅ Sent to the BeatBridge team!" : "❌ Failed to send. Try contact@beatbridge.live directly." },
                            ]);
                          } catch {
                            setMessages((prev) => [
                              ...prev,
                              { role: "assistant", content: "❌ Failed to send. Try contact@beatbridge.live directly." },
                            ]);
                          } finally {
                            setFeedbackSubmitting(false);
                            setFeedbackText("");
                            setShowFeedbackForm(false);
                          }
                        }}
                        disabled={!feedbackText.trim() || feedbackSubmitting}
                        className="flex-1 text-sm font-semibold py-2 px-3 rounded-lg bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {feedbackSubmitting ? "Sending…" : "Send to team →"}
                      </button>
                      <button
                        onClick={() => { setShowFeedbackForm(false); setFeedbackText(""); }}
                        className="px-3 py-2 rounded-lg border border-white/[0.08] text-[#a0a0a0] hover:text-white text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={() => setShowFeedbackForm(true)}
                        className="text-xs text-[#505050] hover:text-orange-400 transition-colors py-1"
                      >
                        📢 Report a bug or suggest a feature
                      </button>
                      {!isSignedIn && (
                        <span className="text-xs text-[#404040]">
                          <Link href="/sign-in" className="hover:text-[#606060] transition-colors underline underline-offset-2">Sign in</Link>
                          {" "}to save history
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
