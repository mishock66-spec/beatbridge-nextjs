"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type Message = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_DOT: Record<string, string> = {
  announcement:   "bg-orange-500",
  update:         "bg-blue-400",
  tip:            "bg-green-400",
  personal:       "bg-purple-400",
  collab_request: "bg-teal-400",
};

export default function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [unread, setUnread]       = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?userId=${encodeURIComponent(userId)}&limit=5`).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json().catch(() => null);
    if (!data) return;
    setMessages(data.messages ?? []);
    setUnread((data.messages ?? []).filter((m: Message) => !m.read).length);
  }, [userId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 60_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/messages/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(() => null);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    setUnread((prev) => Math.max(0, prev - 1));
  }

  function handleOpen() {
    setOpen((o) => !o);
    if (!open) {
      // Mark all visible as read after a short delay
      setTimeout(() => {
        messages.filter((m) => !m.read).forEach((m) => markRead(m.id));
      }, 1500);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-full text-[#a0a0a0] hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#111111] border border-white/[0.1] rounded-xl shadow-xl shadow-black/40 z-[200] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-[0.08em]">Notifications</span>
            {unread > 0 && (
              <span className="text-xs text-orange-400">{unread} unread</span>
            )}
          </div>

          {messages.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-[#505050]">No messages yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {messages.map((m) => (
                <Link
                  key={m.id}
                  href="/inbox"
                  onClick={() => { setOpen(false); if (!m.read) markRead(m.id); }}
                  className={`flex gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors ${!m.read ? "bg-orange-500/[0.04]" : ""}`}
                >
                  <div className="flex-shrink-0 mt-1.5">
                    <span className={`block w-2 h-2 rounded-full ${TYPE_DOT[m.type] ?? "bg-white/30"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug truncate ${m.read ? "text-[#a0a0a0]" : "text-white font-medium"}`}>
                      {m.title}
                    </p>
                    <p className="text-xs text-[#505050] mt-0.5">{timeAgo(m.created_at)}</p>
                  </div>
                  {!m.read && (
                    <div className="flex-shrink-0 self-center w-1.5 h-1.5 rounded-full bg-orange-500" />
                  )}
                </Link>
              ))}
            </div>
          )}

          <div className="px-4 py-2.5 border-t border-white/[0.06]">
            <Link
              href="/inbox"
              onClick={() => setOpen(false)}
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              See all messages →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
