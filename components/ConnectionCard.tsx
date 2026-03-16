"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import type { AirtableRecord } from "@/lib/airtable";

const TYPE_COLORS: Record<string, string> = {
  Producer: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Label: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Sound Engineer": "bg-green-500/20 text-green-300 border-green-500/30",
  DJ: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Manager: "bg-red-500/20 text-red-300 border-red-500/30",
  Studio: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "Artist/Rapper": "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "Photographer/Videographer": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Other: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

const TYPE_EMOJI: Record<string, string> = {
  Producer: "🎹",
  Label: "💿",
  DJ: "🎧",
  Studio: "🎙️",
  Manager: "📋",
  "Sound Engineer": "🔊",
  "Artist/Rapper": "🎤",
  "Photographer/Videographer": "📸",
  Other: "💼",
};

function getTypeEmoji(profileType: string): string {
  return TYPE_EMOJI[profileType] ?? "✦";
}

function TypeEmoji({ profileType }: { profileType: string }) {
  const emoji = getTypeEmoji(profileType);
  return (
    <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
      {emoji}
    </div>
  );
}

function formatFollowers(count: number) {
  if (!count) return "N/A";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function storageKey(artistSlug: string, username: string) {
  return `beatbridge_contacted_${artistSlug}_${username.replace("@", "")}`;
}

export default function ConnectionCard({
  record,
  listeningLink,
  dmPriority,
  artistSlug,
}: {
  record: AirtableRecord;
  listeningLink: string;
  dmPriority?: number;
  artistSlug?: string;
}) {
  const { isSignedIn } = useUser();
  const [copied, setCopied] = useState(false);
  const [sentDM, setSentDM] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customTemplate, setCustomTemplate] = useState<string | null>(null);
  const [draftTemplate, setDraftTemplate] = useState("");
  const [contacted, setContacted] = useState(false);

  useEffect(() => {
    if (!artistSlug) return;
    const key = storageKey(artistSlug, record.username);
    setContacted(localStorage.getItem(key) === "true");
  }, [artistSlug, record.username]);

  function toggleContacted() {
    if (!artistSlug) return;
    const key = storageKey(artistSlug, record.username);
    const next = !contacted;
    localStorage.setItem(key, String(next));
    setContacted(next);
  }

  const typeColor = TYPE_COLORS[record.profileType] || TYPE_COLORS.Other;

  const activeTemplate = customTemplate ?? record.template;

  const LINK_PLACEHOLDER_RE = /\[(?:YOUR (?:LISTENING )?)?LINK\]/gi;

  const resolvedTemplate =
    listeningLink && activeTemplate
      ? activeTemplate.replace(LINK_PLACEHOLDER_RE, listeningLink)
      : activeTemplate;

  function handleCopyDM() {
    if (!resolvedTemplate) return;
    navigator.clipboard.writeText(resolvedTemplate).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSendDM() {
    const username = record.username.replace("@", "");
    const dmUrl = `https://ig.me/m/${username}`;
    if (isSignedIn && resolvedTemplate) {
      navigator.clipboard.writeText(resolvedTemplate).then(() => {
        setSentDM(true);
        window.open(dmUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => setSentDM(false), 4000);
      });
    } else {
      setSentDM(true);
      window.open(dmUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => setSentDM(false), 4000);
    }
  }

  function handleEditClick() {
    setDraftTemplate(activeTemplate);
    setIsEditing(true);
  }

  function handleSave() {
    setCustomTemplate(draftTemplate);
    setIsEditing(false);
  }

  function handleReset() {
    setCustomTemplate(null);
    setDraftTemplate("");
    setIsEditing(false);
  }

  const highlightedTemplate = resolvedTemplate
    ? listeningLink
      ? resolvedTemplate.replace(
          new RegExp(
            listeningLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g"
          ),
          `<mark style="background-color:rgba(249,115,22,0.15);color:rgb(251,146,60);border-radius:3px;padding:0 3px;font-weight:600;">${listeningLink}</mark>`
        )
      : resolvedTemplate.replace(
          LINK_PLACEHOLDER_RE,
          (match) => `<mark style="background-color:rgba(249,115,22,0.3);color:rgb(251,146,60);border-radius:3px;padding:0 3px;font-weight:600;">${match}</mark>`
        )
    : "";

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-5 flex flex-col gap-4 hover:border-orange-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/5 relative">
      {/* DM priority badge — top left */}
      {dmPriority !== undefined && (
        <span className="absolute top-4 left-4 z-10 group">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white cursor-default">
            DM #{dmPriority}
          </span>
          <span className="pointer-events-none absolute left-0 top-full mt-1.5 w-max max-w-[180px] rounded-lg bg-gray-900 border border-orange-500/20 px-2.5 py-1.5 text-[11px] text-gray-300 leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
            Priority based on follower count — easier to reach
          </span>
        </span>
      )}
      {/* Type badge — top right */}
      <span
        className={`absolute top-4 right-4 text-xs font-medium px-2 py-0.5 rounded-full border ${typeColor}`}
      >
        {record.profileType}
      </span>

      {/* Header */}
      <div className={`flex items-start gap-3${dmPriority !== undefined ? " mt-5" : ""}`}>
        <TypeEmoji profileType={record.profileType} />
        <div className="flex-1 min-w-0 pr-20">
          <p className="font-semibold text-white truncate">{record.fullName}</p>
          <a
            href={record.profileUrl || `https://instagram.com/${record.username.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 text-sm hover:underline"
          >
            @{record.username.replace("@", "")}
          </a>
          {record.followers > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {formatFollowers(record.followers)} followers
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {record.description && (
        <p className="text-gray-400 text-sm leading-relaxed">
          {record.description}
        </p>
      )}

      {/* DM Template */}
      {record.template && (
        <div className="bg-[#0a0a0a] rounded-xl p-3 border border-[#1f1f1f] relative">
          {/* Label row */}
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              DM Template
              {customTemplate !== null && isSignedIn && (
                <span className="ml-2 text-orange-400/60 normal-case tracking-normal font-normal">
                  (edited)
                </span>
              )}
            </p>
            {!isEditing && isSignedIn && (
              <button
                onClick={handleEditClick}
                className="text-xs text-gray-500 hover:text-orange-400 transition-colors px-1.5 py-0.5 rounded hover:bg-orange-400/10"
              >
                Edit
              </button>
            )}
          </div>

          {/* Edit mode (signed in only) */}
          {isSignedIn && isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={draftTemplate}
                onChange={(e) => setDraftTemplate(e.target.value)}
                rows={6}
                className="w-full bg-[#111111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-gray-300 text-xs leading-relaxed focus:outline-none focus:border-orange-500/50 resize-y"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-orange-500 text-white hover:bg-orange-400 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg border border-[#1f1f1f] text-gray-400 hover:border-white/30 hover:text-white transition-colors"
                >
                  Reset to default
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <p
                className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap"
                style={!isSignedIn ? { filter: "blur(4px)", pointerEvents: "none", userSelect: "none" } : undefined}
                dangerouslySetInnerHTML={{ __html: highlightedTemplate }}
              />
              {!isSignedIn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Link
                    href="/sign-in"
                    className="text-xs font-bold bg-orange-500 text-black px-3 py-1.5 rounded-full hover:bg-orange-400 transition-colors"
                  >
                    Sign in to view
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-auto pt-1">
        <div className="flex gap-2">
          <button
            onClick={handleCopyDM}
            disabled={!record.template || !isSignedIn}
            className="flex-1 text-sm font-semibold py-2.5 px-3 rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-orange-500 text-white hover:bg-orange-400 active:scale-95"
          >
            {copied ? "✓ Copied!" : "Copy DM"}
          </button>
          {record.template && (
            <button
              onClick={handleSendDM}
              className="flex-1 text-sm font-semibold py-2.5 px-3 rounded-xl border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/70 transition-all duration-150 active:scale-95"
            >
              {sentDM ? "✓ Sent!" : "Send DM →"}
            </button>
          )}
          {record.profileUrl && !record.template && (
            <a
              href={record.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm font-semibold py-2.5 px-3 rounded-xl border border-[#1f1f1f] text-gray-300 hover:border-orange-500/50 hover:text-orange-400 transition-all duration-150 active:scale-95 text-center"
            >
              Open Instagram
            </a>
          )}
        </div>

        {/* Send DM tooltip */}
        {sentDM && (
          <p className="text-xs text-orange-400/80 text-center">
            DM copied — paste it in Instagram (Ctrl+V)
          </p>
        )}

        {/* Mark as contacted */}
        {artistSlug && isSignedIn && (
          <label
            className={`flex items-center gap-2 cursor-pointer mt-1 pt-3 border-t border-[#1f1f1f] transition-colors ${
              contacted ? "text-orange-400" : "text-gray-600 hover:text-gray-400"
            }`}
          >
            <input
              type="checkbox"
              checked={contacted}
              onChange={toggleContacted}
              className="accent-orange-500 w-3.5 h-3.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-xs font-medium">
              {contacted ? "Contacted" : "Mark as contacted"}
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
