"use client";

const TELEGRAM_URL = "https://t.me/+H5L7HpvQtUdlYWFk";

export function TelegramButton({ label = "Join on Telegram →" }: { label?: string }) {
  return (
    <button
      onClick={() => { window.location.href = TELEGRAM_URL; }}
      className="bg-[#229ED9] text-white font-bold rounded-full px-6 py-3 hover:opacity-90 transition-opacity"
    >
      {label}
    </button>
  );
}
