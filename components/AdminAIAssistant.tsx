"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ActionPlan, PreviewRecord, DupGroup } from "@/app/api/admin/ai-assistant/route";

// ── Types ──────────────────────────────────────────────────────────────────────

type ChatStatus =
  | "loading"
  | "preview"
  | "dup_preview"
  | "stats"
  | "confirmed"
  | "executing"
  | "done"
  | "cancelled"
  | "error"
  | "explain"
  | "chat"
  | "agent";

type ChatEntry = {
  id: string;
  userMessage: string;
  timestamp: Date;
  status: ChatStatus;
  plan?: ActionPlan;
  records?: PreviewRecord[];
  count?: number;
  dupGroups?: DupGroup[];
  totalDups?: number;
  contactStats?: {
    total: number;
    byArtist: Record<string, number>;
    noTemplate: number;
    withTemplate: number;
  };
  supabaseStats?: {
    totalUsers: number;
    trialUsers: number;
    paidUsers: number;
    dmsSentToday: number;
    dmsSentTotal: number;
  };
  explanation?: string;
  chatReply?: string;
  result?: { deleted?: number; updated?: number };
  error?: string;
  attachmentLabel?: string;
};

function formatFollowers(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ── Suggested prompts ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Show all Autre contacts in Metro Boomin",
  "How many contacts have no DM template?",
  "Delete all contacts with more than 50K followers",
  "Find duplicate contacts",
  "Give me platform stats",
  "Show contacts from Southside with under 1K followers",
];

const AGENT_SUGGESTIONS = [
  "How many users do we have?",
  "What's our MRR from Stripe?",
  "How many DMs were sent today?",
  "Show contacts with no template for Harry Fraud",
  "What's the plan breakdown (free/trial/paid)?",
  "List the 10 most recent signups",
];

// ── Preview record table ───────────────────────────────────────────────────────

function RecordTable({ records, max = 8 }: { records: PreviewRecord[]; max?: number }) {
  const shown = records.slice(0, max);
  const rest = records.length - shown.length;
  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-white/[0.08]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-white/[0.04] text-[#606060]">
            <th className="text-left px-2.5 py-1.5 font-medium">Username</th>
            <th className="text-left px-2.5 py-1.5 font-medium hidden sm:table-cell">Artist</th>
            <th className="text-left px-2.5 py-1.5 font-medium hidden sm:table-cell">Type</th>
            <th className="text-right px-2.5 py-1.5 font-medium">Followers</th>
            <th className="text-center px-2.5 py-1.5 font-medium hidden md:table-cell">Template</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
              <td className="px-2.5 py-1.5 text-orange-400">@{r.username}</td>
              <td className="px-2.5 py-1.5 text-[#a0a0a0] hidden sm:table-cell truncate max-w-[100px]">{r.suiviPar || "—"}</td>
              <td className="px-2.5 py-1.5 text-[#606060] hidden sm:table-cell">{r.profileType || "—"}</td>
              <td className="px-2.5 py-1.5 text-right text-[#606060]">{formatFollowers(r.followers)}</td>
              <td className="px-2.5 py-1.5 text-center hidden md:table-cell">{r.hasTemplate ? "✓" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rest > 0 && (
        <div className="px-2.5 py-1.5 bg-white/[0.02] text-[#505050] text-xs border-t border-white/[0.04]">
          …and {rest} more
        </div>
      )}
    </div>
  );
}

// ── Duplicate group list ───────────────────────────────────────────────────────

function DupGroupList({ groups, max = 6 }: { groups: DupGroup[]; max?: number }) {
  const shown = groups.slice(0, max);
  const rest = groups.length - shown.length;
  return (
    <div className="mt-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
      {shown.map((g) => (
        <div key={g.username} className="bg-white/[0.03] border border-white/[0.05] rounded-lg px-2.5 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-orange-400">@{g.username}</span>
            <span className="text-[10px] text-[#505050]">{g.records.length} records</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {g.records.map((r) => (
              <span key={r.id} className={`text-[11px] ${r.id === g.keepId ? "text-green-400" : "text-[#505050] line-through"}`}>
                {r.id === g.keepId ? "✓ keep" : "✗ delete"} · {r.suiviPar || "?"}
                {r.hasTemplate ? " · has template" : ""}
              </span>
            ))}
          </div>
        </div>
      ))}
      {rest > 0 && (
        <p className="text-[#505050] text-xs px-1">…and {rest} more username groups</p>
      )}
    </div>
  );
}

// ── Chat bubble ────────────────────────────────────────────────────────────────

function ChatBubble({
  entry,
  previewMode,
  onConfirm,
  onCancel,
  onConfirmDups,
}: {
  entry: ChatEntry;
  previewMode: boolean;
  onConfirm: (entry: ChatEntry) => void;
  onCancel: (id: string) => void;
  onConfirmDups: (entry: ChatEntry) => void;
}) {
  const isDestructive =
    entry.plan?.action === "delete_by_filter" ||
    entry.plan?.action === "update_by_filter";

  return (
    <div className="flex flex-col gap-2.5">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-orange-500/20 border border-orange-500/30 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
          {entry.attachmentLabel && (
            <p className="text-[11px] text-orange-300/70 mb-1">📎 {entry.attachmentLabel}</p>
          )}
          <p className="text-sm text-white">{entry.userMessage}</p>
          <p className="text-[10px] text-orange-400/50 mt-0.5 text-right">{formatTime(entry.timestamp)}</p>
        </div>
      </div>

      {/* AI response */}
      <div className="flex justify-start">
        <div className="max-w-[95%] w-full">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              AI
            </div>
            <span className="text-[11px] text-[#505050]">{formatTime(entry.timestamp)}</span>
          </div>

          <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3">
            {entry.status === "loading" && (
              <div className="flex items-center gap-2 text-[#606060] text-sm">
                <span className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Thinking…
              </div>
            )}

            {entry.status === "executing" && (
              <div className="flex items-center gap-2 text-[#606060] text-sm">
                <span className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Executing…
              </div>
            )}

            {entry.status === "error" && (
              <p className="text-sm text-red-400">⚠ {entry.error}</p>
            )}

            {entry.status === "explain" && (
              <p className="text-sm text-[#a0a0a0] leading-relaxed whitespace-pre-wrap">{entry.explanation}</p>
            )}

            {(entry.status === "chat" || entry.status === "agent") && (
              <p className="text-sm text-[#a0a0a0] leading-relaxed whitespace-pre-wrap">{entry.chatReply}</p>
            )}

            {entry.status === "stats" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[#a0a0a0]">{entry.plan?.description}</p>
                {entry.contactStats && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-white">
                      {entry.contactStats.total.toLocaleString()} total contacts
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(entry.contactStats.byArtist)
                        .sort((a, b) => b[1] - a[1])
                        .map(([artist, count]) => (
                          <div key={artist} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-2 py-1.5">
                            <span className="text-xs text-[#a0a0a0] truncate">{artist}</span>
                            <span className="text-xs font-semibold text-orange-400 ml-2 flex-shrink-0">{count.toLocaleString()}</span>
                          </div>
                        ))}
                    </div>
                    <div className="flex gap-3 text-xs text-[#606060] mt-1">
                      <span>✓ With template: <strong className="text-white">{entry.contactStats.withTemplate.toLocaleString()}</strong></span>
                      <span>✗ No template: <strong className="text-[#a0a0a0]">{entry.contactStats.noTemplate.toLocaleString()}</strong></span>
                    </div>
                  </div>
                )}
                {entry.supabaseStats && (
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {[
                      { label: "Users", value: entry.supabaseStats.totalUsers },
                      { label: "Trial", value: entry.supabaseStats.trialUsers },
                      { label: "Paid", value: entry.supabaseStats.paidUsers },
                      { label: "DMs today", value: entry.supabaseStats.dmsSentToday },
                      { label: "DMs total", value: entry.supabaseStats.dmsSentTotal },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/[0.03] rounded-lg px-2 py-1.5 text-center">
                        <p className="text-[10px] text-[#606060] uppercase tracking-wide">{label}</p>
                        <p className="text-sm font-bold text-orange-400">{value?.toLocaleString() ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {entry.status === "dup_preview" && entry.dupGroups !== undefined && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#a0a0a0]">
                  {entry.dupGroups.length === 0
                    ? "✓ No duplicate usernames found."
                    : `Found ${entry.totalDups} duplicate records across ${entry.dupGroups.length} usernames. I'll keep the most complete record for each username.`}
                </p>
                {entry.dupGroups.length > 0 && (
                  <>
                    <DupGroupList groups={entry.dupGroups} />
                    {previewMode ? (
                      <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl px-3 py-2.5 mt-1">
                        <p className="text-xs font-semibold text-red-400 mb-2">
                          ⚠ Delete {entry.totalDups} duplicate records? This cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => onCancel(entry.id)} className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-white/[0.06] text-[#a0a0a0] hover:bg-white/[0.1] transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => onConfirmDups(entry)} className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors">
                            Yes, delete {entry.totalDups} duplicates
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => onConfirmDups(entry)} className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors mt-1">
                        Delete {entry.totalDups} duplicates (preview off)
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {entry.status === "preview" && !isDestructive && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#a0a0a0]">
                  {entry.plan?.description} — found <strong className="text-white">{entry.count?.toLocaleString()}</strong> contacts.
                </p>
                {entry.records && entry.records.length > 0 && <RecordTable records={entry.records} />}
                {entry.count === 0 && (
                  <p className="text-xs text-[#505050] italic">No contacts matched this filter.</p>
                )}
              </div>
            )}

            {entry.status === "preview" && isDestructive && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#a0a0a0]">
                  {entry.plan?.description} — found{" "}
                  <strong className="text-white">{entry.count?.toLocaleString()}</strong> contacts.
                </p>
                {entry.records && entry.records.length > 0 && <RecordTable records={entry.records} />}
                {entry.count === 0 ? (
                  <p className="text-xs text-[#505050] italic">No contacts matched. Nothing to do.</p>
                ) : previewMode ? (
                  <div className={`rounded-xl px-3 py-2.5 mt-1 border ${entry.plan?.action === "delete_by_filter" ? "bg-red-500/[0.08] border-red-500/20" : "bg-orange-500/[0.08] border-orange-500/20"}`}>
                    <p className={`text-xs font-semibold mb-2 ${entry.plan?.action === "delete_by_filter" ? "text-red-400" : "text-orange-400"}`}>
                      {entry.plan?.action === "delete_by_filter"
                        ? `⚠ Delete ${entry.count} contacts? This cannot be undone.`
                        : `Update ${entry.count} contacts? Fields: ${Object.entries(entry.plan?.updateFields ?? {}).map(([k, v]) => `${k} → "${v}"`).join(", ")}`}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => onCancel(entry.id)} className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-white/[0.06] text-[#a0a0a0] hover:bg-white/[0.1] transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={() => onConfirm(entry)}
                        className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg text-white transition-colors ${entry.plan?.action === "delete_by_filter" ? "bg-red-600 hover:bg-red-500" : "bg-gradient-to-br from-[#f97316] to-[#f85c00] hover:opacity-90"}`}
                      >
                        {entry.plan?.action === "delete_by_filter" ? `Yes, delete ${entry.count}` : `Yes, update ${entry.count}`}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => onConfirm(entry)} className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors mt-1">
                    {entry.plan?.action === "delete_by_filter" ? `Delete ${entry.count} contacts` : `Update ${entry.count} contacts`}
                  </button>
                )}
              </div>
            )}

            {entry.status === "done" && (
              <p className="text-sm text-green-400">
                {entry.result?.deleted !== undefined
                  ? `✓ Done. Deleted ${entry.result.deleted} records.`
                  : entry.result?.updated !== undefined
                  ? `✓ Done. Updated ${entry.result.updated} records.`
                  : "✓ Done."}
              </p>
            )}

            {entry.status === "cancelled" && (
              <p className="text-sm text-[#505050]">Cancelled.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Simple CSV parser ──────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) return { headers: [], rows: [] };
  const splitLine = (line: string) => {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  };
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1, 101).map((l) => {
    const vals = splitLine(l);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
  return { headers, rows };
}

type AttachedFile =
  | { kind: "image"; name: string; base64: string; mediaType: string; label: string }
  | { kind: "csv"; name: string; csvText: string; rowCount: number; label: string };

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminAIAssistant({ adminUserId }: { adminUserId: string }) {
  const [previewMode, setPreviewMode] = useState(true);
  const [agentMode, setAgentMode] = useState(false);
  const [agentHistory, setAgentHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyToast, setHistoryToast] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Init fullscreen from localStorage ────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("admin_ai_fullscreen");
    if (saved === "true") setIsFullscreen(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("admin_ai_fullscreen", String(isFullscreen));
  }, [isFullscreen]);

  // ── Escape key closes fullscreen ──────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // ── Load history on mount ─────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-history?userId=${adminUserId}`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs: Array<{ id: string; role: string; content: string; mode: string; created_at: string }> =
        data.messages ?? [];
      if (msgs.length === 0) return;

      // Pair up user/assistant messages into ChatEntry objects
      const loaded: ChatEntry[] = [];
      const agentCtx: Array<{ role: "user" | "assistant"; content: string }> = [];

      for (let i = 0; i < msgs.length; i++) {
        const m = msgs[i];
        if (m.role === "user") {
          const next = msgs[i + 1];
          if (next?.role === "assistant") {
            loaded.push({
              id: m.id,
              userMessage: m.content,
              timestamp: new Date(m.created_at),
              status: "agent",
              chatReply: next.content,
            });
            if (m.mode === "agent") {
              agentCtx.push({ role: "user", content: m.content });
              agentCtx.push({ role: "assistant", content: next.content });
            }
            i++; // skip assistant message
          }
        }
      }

      setEntries(loaded);
      setAgentHistory(agentCtx);

      if (loaded.length > 0) {
        setHistoryToast(true);
        setTimeout(() => setHistoryToast(false), 3000);
      }
    } catch {
      // Silently fail — history is a convenience feature
    } finally {
      setHistoryLoading(false);
    }
  }, [adminUserId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  // ── Save a pair of messages to history ────────────────────────────────────────
  async function saveMessages(userMsg: string, assistantReply: string, mode: string) {
    try {
      await Promise.all([
        fetch("/api/admin/ai-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: adminUserId, role: "user", content: userMsg, mode }),
        }),
        fetch("/api/admin/ai-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: adminUserId, role: "assistant", content: assistantReply, mode }),
        }),
      ]);
    } catch {
      // Non-critical — don't surface to user
    }
  }

  // ── Clear history ─────────────────────────────────────────────────────────────
  async function clearHistory() {
    setAgentHistory([]);
    setEntries([]);
    try {
      await fetch(`/api/admin/ai-history?userId=${adminUserId}`, { method: "DELETE" });
    } catch {
      // Non-critical
    }
  }

  function updateEntry(id: string, patch: Partial<ChatEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  // ── handleSend ────────────────────────────────────────────────────────────────
  async function handleSend(message?: string) {
    const msg = (message ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);

    const currentFile = attachedFile;
    setAttachedFile(null);

    const entryId = `e_${Date.now()}`;
    const newEntry: ChatEntry = {
      id: entryId,
      userMessage: msg,
      timestamp: new Date(),
      status: "loading",
      attachmentLabel: currentFile?.label,
    };
    setEntries((prev) => [...prev, newEntry]);

    // ── Agent mode (text only) ────────────────────────────────────────────────
    if (agentMode && !currentFile) {
      try {
        const res = await fetch("/api/admin/ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: adminUserId,
            phase: "agent",
            message: msg,
            conversationHistory: agentHistory,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        const reply: string = data.reply ?? "";
        setAgentHistory((prev) => [
          ...prev,
          { role: "user", content: msg },
          { role: "assistant", content: reply },
        ]);
        updateEntry(entryId, { status: "agent", chatReply: reply });
        await saveMessages(msg, reply, "agent");
      } catch (e) {
        updateEntry(entryId, {
          status: "error",
          error: e instanceof Error ? e.message : "Unknown error",
        });
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
      return;
    }

    // ── File attached — chat phase ────────────────────────────────────────────
    if (currentFile) {
      try {
        const body: Record<string, unknown> = {
          userId: adminUserId,
          phase: "chat",
          message: msg,
        };
        if (currentFile.kind === "image") {
          body.image = { base64: currentFile.base64, mediaType: currentFile.mediaType };
        } else {
          body.csvText = currentFile.csvText;
        }
        const res = await fetch("/api/admin/ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        const reply: string = data.reply ?? "";
        updateEntry(entryId, { status: "chat", chatReply: reply });
        await saveMessages(msg, reply, "chat");
      } catch (e) {
        updateEntry(entryId, {
          status: "error",
          error: e instanceof Error ? e.message : "Unknown error",
        });
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
      return;
    }

    // ── Classic plan/execute flow ─────────────────────────────────────────────
    try {
      const res = await fetch("/api/admin/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminUserId, phase: "plan", message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      const plan: ActionPlan = data.plan;

      if (plan.intent === "explain") {
        const explanation = data.explanation ?? "";
        updateEntry(entryId, { status: "explain", plan, explanation });
        await saveMessages(msg, explanation, "classic");
        return;
      }

      if (plan.action === "get_stats") {
        updateEntry(entryId, { status: "stats", plan, contactStats: data.contactStats, supabaseStats: data.stats });
        return;
      }

      if (plan.action === "find_duplicates") {
        updateEntry(entryId, { status: "dup_preview", plan, dupGroups: data.dupGroups ?? [], totalDups: data.totalDups ?? 0 });
        return;
      }

      const isDestructive = plan.action === "delete_by_filter" || plan.action === "update_by_filter";

      if (!isDestructive) {
        updateEntry(entryId, { status: "preview", plan, records: data.records ?? [], count: data.count ?? 0 });
        return;
      }

      if (previewMode) {
        updateEntry(entryId, { status: "preview", plan, records: data.records ?? [], count: data.count ?? 0 });
      } else {
        updateEntry(entryId, { status: "executing", plan, records: data.records ?? [], count: data.count });
        await executeAction(entryId, plan, data.records ?? []);
      }
    } catch (e) {
      updateEntry(entryId, {
        status: "error",
        error: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function executeAction(entryId: string, plan: ActionPlan, records: PreviewRecord[]) {
    updateEntry(entryId, { status: "executing" });
    const ids = records.map((r) => r.id);
    const actionType = plan.action === "delete_by_filter" ? "delete_contacts" : "update_contacts";
    try {
      const res = await fetch("/api/admin/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminUserId, phase: "execute", action: actionType, recordIds: ids, updateFields: plan.updateFields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Execution failed");
      updateEntry(entryId, { status: "done", result: data });
    } catch (e) {
      updateEntry(entryId, { status: "error", error: e instanceof Error ? e.message : "Execution failed" });
    }
  }

  async function executeDupDelete(entryId: string, dupGroups: DupGroup[]) {
    updateEntry(entryId, { status: "executing" });
    try {
      const res = await fetch("/api/admin/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminUserId, phase: "execute", action: "delete_duplicates", dupGroups }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Execution failed");
      updateEntry(entryId, { status: "done", result: data });
    } catch (e) {
      updateEntry(entryId, { status: "error", error: e instanceof Error ? e.message : "Execution failed" });
    }
  }

  function handleConfirm(entry: ChatEntry) {
    if (!entry.records) return;
    executeAction(entry.id, entry.plan!, entry.records);
  }

  function handleConfirmDups(entry: ChatEntry) {
    if (!entry.dupGroups?.length) return;
    executeDupDelete(entry.id, entry.dupGroups);
  }

  function handleCancel(id: string) {
    updateEntry(id, { status: "cancelled" });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        setAttachedFile({ kind: "image", name: file.name, base64, mediaType: file.type, label: file.name });
      };
      reader.readAsDataURL(file);
    } else if (file.name.endsWith(".csv")) {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      const csvText = JSON.stringify(rows, null, 2);
      setAttachedFile({ kind: "csv", name: file.name, csvText, rowCount: rows.length, label: `${file.name} (${rows.length} rows, columns: ${headers.join(", ")})` });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Shared inner content ──────────────────────────────────────────────────────
  const chatContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 flex-wrap gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-light tracking-[0.02em]">AI Assistant</h2>
          <p className="text-xs text-[#505050] mt-0.5 truncate">
            {agentMode
              ? "Agent mode — direct API access via tools"
              : "Classic mode — structured plan/preview/execute"}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Agent toggle */}
          <div className="flex items-center gap-2">
            <span className={`text-xs ${agentMode ? "text-orange-400" : "text-[#606060]"}`}>
              {agentMode ? "⚡ Agent" : "Classic"}
            </span>
            <button
              onClick={() => { setAgentMode((v) => !v); setAgentHistory([]); }}
              className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${agentMode ? "bg-orange-500" : "bg-white/[0.1]"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${agentMode ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Clear history */}
          {entries.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-[10px] px-2 py-1 rounded-lg border border-white/[0.08] text-[#505050] hover:text-orange-400 hover:border-orange-500/20 transition-colors"
            >
              Clear
            </button>
          )}

          {/* Preview toggle (classic only) */}
          {!agentMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#606060]">Preview</span>
              <button
                onClick={() => setPreviewMode((v) => !v)}
                className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${previewMode ? "bg-orange-500" : "bg-white/[0.1]"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${previewMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          )}

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? "Exit fullscreen (Esc)" : "Expand fullscreen"}
            className="text-[#606060] hover:text-orange-400 transition-colors p-1 rounded-lg hover:bg-white/[0.04] text-base leading-none"
          >
            {isFullscreen ? "✕" : "⛶"}
          </button>
        </div>
      </div>

      {/* History toast */}
      {historyToast && (
        <div className="flex-shrink-0 mb-2 text-[11px] text-[#505050] text-center animate-pulse">
          History loaded
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1 pb-2">
        {historyLoading ? (
          <div className="flex flex-col gap-4 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2 animate-pulse">
                <div className="flex justify-end">
                  <div className="h-8 w-48 rounded-2xl bg-white/[0.04]" />
                </div>
                <div className="h-12 w-64 rounded-2xl bg-white/[0.025]" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg">
              {agentMode ? "⚡" : "🤖"}
            </div>
            <div>
              {agentMode ? (
                <>
                  <p className="text-[#a0a0a0] text-sm mb-1">Agent mode — I have direct API access.</p>
                  <p className="text-[#505050] text-xs">Query Airtable, Supabase, Stripe & Clerk in plain English.</p>
                </>
              ) : (
                <>
                  <p className="text-[#a0a0a0] text-sm mb-1">Tell me what to do with BeatBridge data.</p>
                  <p className="text-[#505050] text-xs">I can filter, delete, update contacts and pull stats.</p>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {(agentMode ? AGENT_SUGGESTIONS : SUGGESTIONS).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/[0.08] text-[#606060] hover:border-orange-500/30 hover:text-orange-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          entries.map((entry) => (
            <ChatBubble
              key={entry.id}
              entry={entry}
              previewMode={previewMode}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              onConfirmDups={handleConfirmDups}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 mt-3 border-t border-white/[0.06] pt-3">
        {entries.length > 0 && (
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {(agentMode ? AGENT_SUGGESTIONS : SUGGESTIONS).slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                disabled={loading}
                className="text-[10px] px-2 py-1 rounded-full border border-white/[0.06] text-[#505050] hover:border-orange-500/20 hover:text-orange-400/80 transition-colors disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {attachedFile && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="flex items-center gap-1.5 text-xs bg-orange-500/10 border border-orange-500/20 text-orange-300/80 rounded-lg px-2.5 py-1.5 max-w-full truncate">
              📎 {attachedFile.label}
            </span>
            <button onClick={() => setAttachedFile(null)} className="text-[#505050] hover:text-white transition-colors flex-shrink-0 text-sm leading-none" title="Remove attachment">
              ✕
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*,.csv" className="hidden" onChange={handleFileSelect} />

        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Attach image or CSV"
            className="px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#606060] hover:text-orange-400 hover:border-orange-500/30 transition-colors disabled:opacity-40 flex-shrink-0 min-h-[44px]"
          >
            📎
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={
              attachedFile
                ? "Describe what to do with this file…"
                : agentMode
                ? "Ask anything — direct access to Airtable, Stripe, Supabase & Clerk…"
                : "Tell the AI what to do…"
            }
            className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/50 transition-colors resize-none disabled:opacity-60 min-h-[44px] max-h-[120px]"
            style={{ height: "auto" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || (!input.trim() && !attachedFile)}
            className="px-4 py-3 rounded-xl bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold text-sm hover:opacity-90 hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex-shrink-0"
          >
            {loading ? (
              <span className="w-4 h-4 block border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "→"
            )}
          </button>
        </div>
        <p className="text-[10px] text-[#404040] mt-1.5 text-center">
          {agentMode
            ? "⚡ Agent mode — queries Airtable, Stripe, Supabase & Clerk directly"
            : "Enter to send · Shift+Enter for new line · 📎 attach images or CSVs"}
        </p>
      </div>
    </>
  );

  // ── Fullscreen overlay ────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#080808] flex flex-col p-4 sm:p-6 transition-all duration-300">
        {chatContent}
      </div>
    );
  }

  // ── Normal inline layout ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
      {chatContent}
    </div>
  );
}
