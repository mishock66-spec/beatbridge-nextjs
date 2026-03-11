"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1f1f1f] backdrop-blur-md bg-[#0a0a0a]/90">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight">
            Beat<span className="text-orange-500">Bridge</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/artists"
            className={`text-sm font-medium transition-colors ${
              pathname.startsWith("/artist")
                ? "text-orange-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Artists
          </Link>
          <Link
            href="/#waitlist"
            className="text-sm font-semibold bg-orange-500 text-white px-4 py-2 rounded-full hover:bg-orange-400 transition-colors"
          >
            Get Early Access
          </Link>
        </div>
      </div>
    </nav>
  );
}
