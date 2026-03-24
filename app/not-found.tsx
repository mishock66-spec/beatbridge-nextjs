import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p
          className="text-8xl sm:text-9xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-br from-[#f97316] to-[#f85c00]"
          style={{ lineHeight: 1 }}
        >
          404
        </p>
        <h1 className="text-2xl sm:text-3xl font-light tracking-[0.02em] mb-3">
          Page not found
        </h1>
        <p className="text-[#a0a0a0] mb-10 text-base">
          This network doesn&apos;t exist. Yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
        >
          Back to BeatBridge →
        </Link>
      </div>
    </div>
  );
}
