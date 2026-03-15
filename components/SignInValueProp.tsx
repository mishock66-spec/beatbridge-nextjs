"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function SignInValueProp() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded || isSignedIn) return null;

  return (
    <section className="py-24 px-4 border-t border-white/5">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-black mb-4">
          Track your outreach.{" "}
          <span className="text-orange-500">Never lose your progress.</span>
        </h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed mb-10">
          Create a free account to track which contacts you&apos;ve DMed, see
          your progress per artist, and get notified when new networks drop.
        </p>
        <ul className="flex flex-col sm:flex-row gap-4 justify-center mb-10 text-sm font-semibold">
          <li className="flex items-center gap-2 text-gray-300">
            ✅ Track every DM you&apos;ve sent
          </li>
          <li className="flex items-center gap-2 text-gray-300">
            🔔 Get notified when new artists are added
          </li>
          <li className="flex items-center gap-2 text-gray-300">
            📊 See your progress across all networks
          </li>
        </ul>
        <Link
          href="/sign-up"
          className="inline-block bg-orange-500 text-black font-bold px-8 py-4 rounded-full hover:bg-orange-400 transition-colors text-base"
        >
          Create free account →
        </Link>
      </div>
    </section>
  );
}
