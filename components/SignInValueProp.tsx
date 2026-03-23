"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function SignInValueProp() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded || isSignedIn) return null;

  return (
    <section className="py-32 px-4 border-t border-white/[0.05]">
      <div className="max-w-3xl mx-auto text-center scroll-animate">
        <h2 className="text-3xl sm:text-4xl font-light tracking-[0.02em] mb-4">
          Track your outreach.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-[#f85c00]">
            Never lose your progress.
          </span>
        </h2>
        <p className="text-[#a0a0a0] text-lg max-w-xl mx-auto leading-relaxed mb-12">
          Create a free account to track which contacts you&apos;ve DMed, see
          your progress per artist, and get notified when new networks drop.
        </p>
        <ul className="flex flex-col sm:flex-row gap-4 justify-center mb-12 text-sm font-medium">
          <li className="flex items-center gap-2 text-[#a0a0a0]">
            ✅ Track every DM you&apos;ve sent
          </li>
          <li className="flex items-center gap-2 text-[#a0a0a0]">
            🔔 Get notified when new artists are added
          </li>
          <li className="flex items-center gap-2 text-[#a0a0a0]">
            📊 See your progress across all networks
          </li>
        </ul>
        <Link
          href="/sign-up"
          className="inline-block bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold px-8 py-4 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200 text-base"
        >
          Create free account →
        </Link>
      </div>
    </section>
  );
}
