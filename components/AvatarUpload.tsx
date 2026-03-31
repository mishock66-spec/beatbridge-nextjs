"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

async function resizeToJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const size = 400;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      // Center-crop to square
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Load failed")); };
    img.src = objectUrl;
  });
}

export default function AvatarUpload() {
  const { user } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Initialise with the stored avatar once user loads
  useEffect(() => {
    if (user && !avatarUrl) {
      setAvatarUrl(
        `${SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}.jpg`
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleFile(file: File) {
    if (!user || !supabase) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP files allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB.");
      return;
    }

    setUploading(true);
    try {
      const blob = await resizeToJpeg(file);
      const path = `${user.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;

      const cleanUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;

      await supabase.from("user_profiles").upsert(
        { user_id: user.id, avatar_url: cleanUrl, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

      // Cache-bust locally so the img refreshes immediately
      setAvatarUrl(`${cleanUrl}?t=${Date.now()}`);
      toast.success("Profile photo updated!");
    } catch {
      toast.error("Upload failed, try again.");
    } finally {
      setUploading(false);
    }
  }

  const username = user?.firstName ?? user?.username ?? "?";
  const initial = username[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative group cursor-pointer"
        style={{ width: 96, height: 96 }}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {/* Avatar image or initials */}
        {avatarUrl && !uploading ? (
          <img
            src={avatarUrl}
            alt={username}
            className="w-full h-full rounded-full object-cover"
            onError={() => setAvatarUrl(null)}
          />
        ) : (
          <div className="w-full h-full rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
            {uploading ? (
              <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-4xl font-semibold text-orange-400">{initial}</span>
            )}
          </div>
        )}

        {/* Hover overlay */}
        {!uploading && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-white text-[10px] font-medium">Change photo</span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#505050]">JPG, PNG or WebP · max 2MB</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
