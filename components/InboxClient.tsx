"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

type Message = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
};

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  announcement: { label: "Announcement", cls: "bg-orange-500/15 text-orange-400" },
  update:       { label: "Update",        cls: "bg-blue-500/15 text-blue-400" },
  tip:          { label: "Tip",           cls: "bg-green-500/15 text-green-400" },
  personal:     { label: "Personal",      cls: "bg-purple-500/15 text-purple-400" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Very basic markdown renderer for bold, italic, newlines
function renderBody(text: string) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]*?)\*\*/);
    const italicMatch = remaining.match(/^([\s\S]*?)\*([\s\S]*?)\*/);

    let match = null;
    if (boldMatch && italicMatch) {
      match = boldMatch[0].length <= italicMatch[0].length ? boldMatch : italicMatch;
    } else {
      match = boldMatch ?? italicMatch;
    }

    if (!match) break;

    const before = match[1];
    const inner = match[2];
    const isBold = remaining.startsWith(before + "**");

    if (before) {
      before.split("\n").forEach((line, i) => {
        if (i > 0) parts.push(<br key={key++} />);
        if (line) parts.push(<span key={key++}>{line}</span>);
      });
    }
    if (isBold) {
      parts.push(<strong key={key++} className="text-white">{inner}</strong>);
    } else {
      parts.push(<em key={key++}>{inner}</em>);
    }
    remaining = remaining.slice(match[0].length);
  }

  if (remaining) {
    remaining.split("\n").forEach((line, i) => {
      if (i > 0) parts.push(<br key={key++} />);
      if (line) parts.push(<span key={key++}>{line}</span>);
    });
  }

  return parts;
}

export default function InboxClient() {
  const { user, isLoaded } = useUser();
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    fetch(`/api/messages?userId=${encodeURIComponent(user.id)}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoaded, user?.id]);

  async function handleExpand(msg: Message) {
    if (expanded === msg.id) {
      setExpanded(null);
      return;
    }
    setExpanded(msg.id);
    if (!msg.read) {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)));
      await fetch(`/api/messages/${msg.id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user!.id }),
      }).catch(() => null);
    }
  }

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <p className="text-[#505050] text-sm">Sign in to view your inbox.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-[0.02em] text-white">Inbox</h1>
          <p className="text-sm text-[#505050] mt-1">
            {messages.filter((m) => !m.read).length > 0
              ? `${messages.filter((m) => !m.read).length} unread`
              : "All caught up"}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/[0.025] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl px-6 py-16 text-center">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-[#a0a0a0] text-sm font-medium">No messages yet — check back soon.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((msg) => {
              const typeInfo = TYPE_LABEL[msg.type] ?? { label: msg.type, cls: "bg-white/[0.06] text-[#707070]" };
              const isOpen = expanded === msg.id;
              return (
                <button
                  key={msg.id}
                  onClick={() => handleExpand(msg)}
                  className={`w-full text-left bg-white/[0.025] border rounded-xl px-5 py-4 transition-all duration-200 ${
                    isOpen
                      ? "border-orange-500/30"
                      : msg.read
                      ? "border-white/[0.06] hover:border-white/[0.12]"
                      : "border-orange-500/20 bg-orange-500/[0.03] hover:border-orange-500/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!msg.read && !isOpen && (
                      <div className="flex-shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-orange-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.cls}`}>
                          {typeInfo.label}
                        </span>
                        <span className="text-xs text-[#505050]">{formatDate(msg.created_at)}</span>
                      </div>
                      <p className={`text-sm leading-snug ${msg.read && !isOpen ? "text-[#a0a0a0]" : "text-white font-medium"}`}>
                        {msg.title}
                      </p>
                      {!isOpen && (
                        <p className="text-xs text-[#505050] mt-1 truncate">{msg.body}</p>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 flex-shrink-0 text-[#505050] mt-0.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06] text-sm text-[#a0a0a0] leading-relaxed text-left">
                      {renderBody(msg.body)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
