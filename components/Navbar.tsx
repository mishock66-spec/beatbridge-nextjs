"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md bg-[#0f0f0f]/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight">
            Beat<span className="text-amber-400">Bridge</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/artists"
            className={`text-sm font-medium transition-colors ${
              pathname.startsWith("/artist")
                ? "text-amber-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Artists
          </Link>
          <Link
            href="/#waitlist"
            className="text-sm font-semibold bg-amber-400 text-black px-4 py-2 rounded-full hover:bg-amber-300 transition-colors"
          >
            Get Early Access
          </Link>
        </div>
      </div>
    </nav>
  );
}
