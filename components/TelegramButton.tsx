"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

const TELEGRAM_URL = "https://t.me/+H5L7HpvQtUdlYWFk";

export function TelegramButton({ label = "Join on Telegram →" }: { label?: string }) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <Link
        href="/sign-in"
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        Sign in to access the community
      </Link>
    );
  }

  return (
    <button
      onClick={() => { window.location.href = TELEGRAM_URL; }}
      className="bg-[#229ED9] text-white font-bold rounded-full px-6 py-3 hover:opacity-90 transition-opacity"
    >
      {label}
    </button>
  );
}
