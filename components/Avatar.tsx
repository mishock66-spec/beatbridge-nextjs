"use client";

import { useState } from "react";

export default function Avatar({
  url,
  username,
  size = 40,
  className = "",
}: {
  url?: string | null;
  username: string;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initial = username ? username[0].toUpperCase() : "?";

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={username}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={`rounded-full flex items-center justify-center flex-shrink-0 bg-orange-500/15 border border-orange-500/30 font-semibold text-orange-400 ${className}`}
    >
      {initial}
    </div>
  );
}
