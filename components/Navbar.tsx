"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? "border-white/[0.06] backdrop-blur-[20px] bg-[rgba(8,8,8,0.85)]"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">
            Beat<span className="text-orange-500">Bridge</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/artists"
            className={`hidden sm:block text-sm font-medium tracking-wide transition-colors ${
              pathname.startsWith("/artist")
                ? "text-orange-500"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            Artists
          </Link>

          <Link
            href="/leaderboard"
            className={`hidden sm:block text-sm font-medium tracking-wide transition-colors ${
              pathname === "/leaderboard"
                ? "text-orange-500"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            Leaderboard
          </Link>

          <Link
            href="/mutual-contacts"
            className={`hidden sm:block text-sm font-medium tracking-wide transition-colors ${
              pathname === "/mutual-contacts"
                ? "text-orange-500"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            Mutual Contacts
          </Link>

          <Link
            href="/why-beatbridge"
            className={`hidden sm:block text-sm font-medium tracking-wide transition-colors ${
              pathname === "/why-beatbridge"
                ? "text-orange-500"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            Why BeatBridge
          </Link>

          <Link
            href="/network-chain"
            className={`hidden sm:block text-sm font-medium tracking-wide transition-colors ${
              pathname === "/network-chain"
                ? "text-orange-500"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            Network Chain
          </Link>

          <Link
            href="/pricing"
            className={`hidden sm:block text-sm font-medium tracking-wide transition-colors ${
              pathname === "/pricing"
                ? "text-orange-500"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            Pricing
          </Link>

          <Link
            href="/community"
            className={`hidden sm:block text-sm font-medium tracking-wide transition-colors ${
              pathname === "/community"
                ? "text-orange-500"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            Community
          </Link>

          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className={`text-sm font-medium tracking-wide transition-colors ${
                  pathname === "/dashboard"
                    ? "text-orange-500"
                    : "text-[#a0a0a0] hover:text-white"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/onboarding"
                className={`hidden sm:block text-sm font-medium tracking-wide transition-colors ${
                  pathname === "/onboarding"
                    ? "text-orange-500"
                    : "text-[#a0a0a0] hover:text-white"
                }`}
              >
                My Profile
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              {isLoaded && (
                <SignInButton>
                  <button className="text-sm font-medium tracking-wide text-[#a0a0a0] hover:text-white transition-colors">
                    Sign in
                  </button>
                </SignInButton>
              )}
              <Link
                href="/#waitlist"
                className="hidden sm:flex text-sm font-semibold bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Get Early Access
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
