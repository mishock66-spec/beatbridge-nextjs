"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function CommunityPage() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-[#111111] border border-[#1f1f1f] rounded-2xl p-10 text-center">
        <div className="text-4xl mb-4">✈️</div>
        <h1 className="text-2xl sm:text-3xl font-black mb-3">
          Join the BeatBridge Community
        </h1>

        {!isLoaded ? null : isSignedIn ? (
          <>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Connect with beatmakers, share wins, and get tips from producers who are actively networking.
            </p>
            <button
              onClick={() => { window.location.href = "https://t.me/+H5L7HpvQtUdlYWFk"; }}
              className="bg-[#229ED9] text-white font-bold rounded-full px-6 py-3 hover:opacity-90 transition-opacity"
            >
              Join on Telegram →
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Sign in to access our private community of beatmakers and producers.
            </p>
            <Link
              href="/sign-in"
              className="inline-block bg-[#229ED9] text-white font-bold rounded-full px-6 py-3 hover:opacity-90 transition-opacity"
            >
              Sign in to access →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
