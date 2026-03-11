"use client";

import { useState } from "react";
import type { AirtableRecord } from "@/lib/airtable";

const TYPE_COLORS: Record<string, string> = {
  Beatmaker: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Label: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Engineer: "bg-green-500/20 text-green-300 border-green-500/30",
  DJ: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Manager: "bg-red-500/20 text-red-300 border-red-500/30",
  Studio: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Journalist: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Other: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatFollowers(count: number) {
  if (!count) return "N/A";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function Avatar({
  username,
  fullName,
}: {
  username: string;
  fullName: string;
}) {
  const [imgError, setImgError] = useState(false);
  const clean = username.replace("@", "");
  const avatarUrl = clean ? `https://unavatar.io/instagram/${clean}` : null;
  const initials = getInitials(fullName);

  if (!imgError && avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={fullName}
        onError={() => setImgError(true)}
        className="w-14 h-14 rounded-full object-cover bg-[#2a2a2a]"
      />
    );
  }

  return (
    <div className="w-14 h-14 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
      <span className="text-amber-400 font-bold text-lg">{initials}</span>
    </div>
  );
}

export default function ConnectionCard({
  record,
  listeningLink,
}: {
  record: AirtableRecord;
  listeningLink: string;
}) {
  const [copied, setCopied] = useState(false);

  const typeColor = TYPE_COLORS[record.profileType] || TYPE_COLORS.Other;

  const resolvedTemplate =
    listeningLink && record.template
      ? record.template.replace(/\[YOUR LINK\]/gi, listeningLink)
      : record.template;

  function handleCopyDM() {
    if (!resolvedTemplate) return;
    navigator.clipboard.writeText(resolvedTemplate).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const highlightedTemplate = resolvedTemplate
    ? listeningLink
      ? resolvedTemplate.replace(
          new RegExp(
            listeningLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g"
          ),
          `<mark style="background-color:rgba(251,191,36,0.15);color:rgb(252,211,77);border-radius:3px;padding:0 3px;font-weight:600;">${listeningLink}</mark>`
        )
      : resolvedTemplate.replace(
          /\[YOUR LINK\]/gi,
          '<mark style="background-color:rgba(251,191,36,0.3);color:rgb(252,211,77);border-radius:3px;padding:0 3px;font-weight:600;">[YOUR LINK]</mark>'
        )
    : "";

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4 hover:border-amber-400/30 transition-all duration-200 hover:shadow-lg hover:shadow-amber-400/5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar username={record.username} fullName={record.fullName} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{record.fullName}</p>
          <p className="text-amber-400 text-sm">
            @{record.username.replace("@", "")}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeColor}`}
            >
              {record.profileType}
            </span>
            {record.followers > 0 && (
              <span className="text-xs text-gray-500">
                {formatFollowers(record.followers)} followers
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {record.description && (
        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
          {record.description}
        </p>
      )}

      {/* DM Template Preview */}
      {record.template && (
        <div className="bg-[#0f0f0f] rounded-xl p-3 border border-white/5">
          <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">
            DM Template
          </p>
          <p
            className="text-gray-300 text-xs leading-relaxed line-clamp-3"
            dangerouslySetInnerHTML={{ __html: highlightedTemplate }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button
          onClick={handleCopyDM}
          disabled={!record.template}
          className="flex-1 text-sm font-semibold py-2.5 px-3 rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-amber-400 text-black hover:bg-amber-300 active:scale-95"
        >
          {copied ? "✓ Copied!" : "Copy DM"}
        </button>
        {record.profileUrl && (
          <a
            href={record.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-sm font-semibold py-2.5 px-3 rounded-xl border border-white/10 text-gray-300 hover:border-amber-400/50 hover:text-amber-400 transition-all duration-150 active:scale-95 text-center"
          >
            Open Instagram
          </a>
        )}
      </div>
    </div>
  );
}
