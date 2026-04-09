"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { AirtableRecord } from "@/lib/airtable";

interface AdminContactModalProps {
  record: AirtableRecord;
  userId: string;
  onSave: (recordId: string, updates: Partial<AirtableRecord>) => void;
  onClose: () => void;
}

export default function AdminContactModal({ record, userId, onSave, onClose }: AdminContactModalProps) {
  const [fullName, setFullName] = useState(record.fullName);
  const [username, setUsername] = useState(record.username.replace(/^@/, ""));
  const [followers, setFollowers] = useState(String(record.followers ?? ""));
  const [profileType, setProfileType] = useState(record.profileType ?? "");
  const [bio, setBio] = useState(record.description ?? "");
  const [template, setTemplate] = useState(record.template ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/contact-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          recordId: record.id,
          fullName,
          username,
          followers: followers ? Number(followers) : undefined,
          profileType,
          bio,
          template,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Save failed");
      }
      const updates: Partial<AirtableRecord> = {
        fullName,
        username,
        followers: followers ? Number(followers) : record.followers,
        profileType,
        description: bio,
        template,
      };
      onSave(record.id, updates);
      toast.success("Contact saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="bg-[#111111] border border-white/[0.1] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.08]">
          <h2 className="text-base font-semibold text-white">Edit Contact</h2>
          <button
            onClick={onClose}
            className="text-[#606060] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.05]"
          >
            ✕
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" value={fullName} onChange={setFullName} />
            <Field
              label="Username (no @)"
              value={username}
              onChange={(v) => setUsername(v.replace(/^@/, ""))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Followers" value={followers} onChange={setFollowers} type="number" />
            <Field label="Profile Type" value={profileType} onChange={setProfileType} />
          </div>
          <Textarea label="Bio / Notes" value={bio} onChange={setBio} rows={3} />
          <Textarea label="DM Template (Step 1)" value={template} onChange={setTemplate} rows={4} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 text-sm font-medium px-4 py-2.5 rounded-lg border border-white/[0.1] text-[#a0a0a0] hover:text-white hover:border-white/[0.2] transition-all min-h-[40px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all disabled:opacity-50 min-h-[40px]"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#606060] uppercase tracking-[0.08em] mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 transition-colors min-h-[40px]"
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#606060] uppercase tracking-[0.08em] mb-1.5">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#404040] focus:outline-none focus:border-orange-500/50 transition-colors resize-y"
      />
    </div>
  );
}
