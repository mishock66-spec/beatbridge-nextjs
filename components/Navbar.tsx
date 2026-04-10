"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk, SignInButton } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import Avatar from "@/components/Avatar";
import NotificationBell from "@/components/NotificationBell";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const ADMIN_EMAIL = "mishock66@gmail.com";

function NavAvatar({ userId, username, isAdmin }: { userId: string; username: string; isAdmin?: boolean }) {
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const avatarUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${userId}.jpg`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full ring-2 ring-transparent hover:ring-orange-500/40 transition-all duration-150"
        aria-label="Account menu"
      >
        <Avatar url={avatarUrl} username={username} size={32} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-[#111111] border border-white/[0.1] rounded-xl overflow-hidden shadow-xl shadow-black/40 z-[200]">
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-orange-400 hover:text-orange-300 hover:bg-white/[0.04] transition-colors"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Admin ⚡
            </Link>
          )}
          <Link
            href="/onboarding"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#a0a0a0] hover:text-white hover:bg-white/[0.04] transition-colors ${isAdmin ? "border-t border-white/[0.06]" : ""}`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Profile
          </Link>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#a0a0a0] hover:text-white hover:bg-white/[0.04] transition-colors border-t border-white/[0.06]"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded, user } = useUser();
  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-[100] border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? "border-white/[0.06] backdrop-blur-[20px] bg-[rgba(8,8,8,0.85)]"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.webp" alt="BeatBridge" className="h-8 w-auto object-contain" />
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Artists dropdown */}
          <div className="hidden sm:block relative group">
            <button
              className={`text-sm font-medium tracking-wide transition-colors flex items-center gap-1 ${
                pathname.startsWith("/artist") || pathname === "/coming-soon"
                  ? "text-orange-500"
                  : "text-[#a0a0a0] hover:text-white"
              }`}
            >
              Artists
              <svg
                className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity mt-px"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute top-full left-0 pt-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
              <div className="bg-[rgba(18,18,18,0.97)] backdrop-blur-[20px] border border-white/[0.08] rounded-xl overflow-hidden min-w-[160px] shadow-xl shadow-black/40">
                <Link
                  href="/artists"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.05] ${
                    pathname.startsWith("/artist") && pathname !== "/coming-soon"
                      ? "text-orange-500"
                      : "text-[#a0a0a0] hover:text-white"
                  }`}
                >
                  Browse Networks
                </Link>
                <Link
                  href="/coming-soon"
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.05] border-t border-white/[0.06] ${
                    pathname === "/coming-soon"
                      ? "text-orange-500"
                      : "text-[#a0a0a0] hover:text-white"
                  }`}
                >
                  Coming Soon
                </Link>
              </div>
            </div>
          </div>

          <Link
            href="/vote"
            className={`hidden sm:block text-sm font-medium tracking-wide transition-colors ${
              pathname === "/vote"
                ? "text-orange-500"
                : "text-[#a0a0a0] hover:text-white"
            }`}
          >
            Vote
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
              <NotificationBell userId={user!.id} />
              <NavAvatar
                userId={user!.id}
                username={user!.firstName ?? user!.username ?? user!.emailAddresses[0]?.emailAddress?.split("@")[0] ?? "U"}
                isAdmin={isAdmin}
              />
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
