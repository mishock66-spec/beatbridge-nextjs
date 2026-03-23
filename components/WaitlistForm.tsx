"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Always show success even if audience isn't configured yet
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-4">
        <div className="text-3xl mb-3">🔥</div>
        <p className="text-orange-500 font-medium text-lg">You&apos;re on the list.</p>
        <p className="text-[#a0a0a0] text-sm mt-1">We&apos;ll hit you when Pro drops.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        disabled={loading}
        className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-lg px-5 py-3 text-white placeholder-[#505050] focus:outline-none focus:border-orange-500/60 text-sm disabled:opacity-50 transition-colors min-h-[44px]"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200 text-sm whitespace-nowrap disabled:opacity-50 min-h-[44px]"
      >
        {loading ? "Joining..." : "Get Early Access"}
      </button>
      {error && <p className="text-red-400 text-xs text-center w-full">{error}</p>}
    </form>
  );
}
