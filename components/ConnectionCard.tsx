"use client";

import { useState } from "react";
import type { AirtableRecord } from "@/lib/airtable";

const TYPE_COLORS: Record<string, string> = {
  Beatmaker: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Producer: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Producteur: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Label: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Engineer: "bg-green-500/20 text-green-300 border-green-500/30",
  "Ingé son": "bg-green-500/20 text-green-300 border-green-500/30",
  DJ: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Manager: "bg-red-500/20 text-red-300 border-red-500/30",
  "Manager/A&R": "bg-red-500/20 text-red-300 border-red-500/30",
  Studio: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Journalist: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Media: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Photographe: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Vidéaste: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Artist: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  Artiste: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  Rappeur: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  Entrepreneur: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  Entourage: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  Autre: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  Other: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

const TYPE_EMOJI: Record<string, string> = {
  Beatmaker: "🎹",
  Producer: "🎹",
  Producteur: "🎹",
  "Producer / Beatmaker": "🎹",
  "Producer / Beatmaker / Producteur": "🎹",
  Label: "💿",
  DJ: "🎧",
  Studio: "🎙️",
  Manager: "📋",
  "Manager/A&R": "📋",
  "Manager / A&R": "📋",
  Engineer: "🔊",
  "Ingé son": "🔊",
  Artist: "🎨",
  Artiste: "🎨",
  Rappeur: "🎨",
  Journalist: "📰",
  Media: "📰",
  Photographe: "📰",
  Vidéaste: "📰",
  Entrepreneur: "💼",
  Entourage: "💼",
  Autre: "💼",
  Other: "💼",
};

function getTypeEmoji(profileType: string): string {
  if (!profileType) return "✦";
  // Exact match first
  if (TYPE_EMOJI[profileType]) return TYPE_EMOJI[profileType];
  // Partial match (for compound types like "Producer / Beatmaker / Producteur")
  const lower = profileType.toLowerCase();
  if (lower.includes("beat") || lower.includes("produc")) return "🎹";
  if (lower.includes("label")) return "💿";
  if (lower.includes("dj")) return "🎧";
  if (lower.includes("studio")) return "🎙️";
  if (lower.includes("manager") || lower.includes("a&r")) return "📋";
  if (lower.includes("engin") || lower.includes("ingé") || lower.includes("inge")) return "🔊";
  if (lower.includes("artist") || lower.includes("artiste") || lower.includes("rappeur")) return "🎨";
  if (lower.includes("media") || lower.includes("photo") || lower.includes("vid")) return "📰";
  if (lower.includes("entrepreneur") || lower.includes("entourage") || lower.includes("autre") || lower.includes("other")) return "💼";
  return "✦";
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

export default function ConnectionCard({
  record,
  listeningLink,
}: {
  record: AirtableRecord;
  listeningLink: string;
}) {
  const [copied, setCopied] = useState(false);
  const [sentDM, setSentDM] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customTemplate, setCustomTemplate] = useState<string | null>(null);
  const [draftTemplate, setDraftTemplate] = useState("");

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
    if (!resolvedTemplate) return;
    const username = record.username.replace("@", "");
    const dmUrl = `https://ig.me/m/${username}`;
    navigator.clipboard.writeText(resolvedTemplate).then(() => {
      setSentDM(true);
      if (dmUrl) window.open(dmUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => setSentDM(false), 4000);
    });
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
      {/* Type badge — top right */}
      <span
        className={`absolute top-4 right-4 text-xs font-medium px-2 py-0.5 rounded-full border ${typeColor}`}
      >
        {record.profileType}
      </span>

      {/* Header */}
      <div className="flex items-start gap-3">
        <TypeEmoji profileType={record.profileType} />
        <div className="flex-1 min-w-0 pr-20">
          <p className="font-semibold text-white truncate">{record.fullName}</p>
          <p className="text-orange-400 text-sm">
            @{record.username.replace("@", "")}
          </p>
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
        <div className="bg-[#0a0a0a] rounded-xl p-3 border border-[#1f1f1f]">
          {/* Label row */}
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              DM Template
              {customTemplate !== null && (
                <span className="ml-2 text-orange-400/60 normal-case tracking-normal font-normal">
                  (edited)
                </span>
              )}
            </p>
            {!isEditing && (
              <button
                onClick={handleEditClick}
                className="text-xs text-gray-500 hover:text-orange-400 transition-colors px-1.5 py-0.5 rounded hover:bg-orange-400/10"
              >
                Edit
              </button>
            )}
          </div>

          {/* Edit mode */}
          {isEditing ? (
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
            <p
              className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightedTemplate }}
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-auto pt-1">
        <div className="flex gap-2">
          <button
            onClick={handleCopyDM}
            disabled={!record.template}
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
      </div>
    </div>
  );
}
