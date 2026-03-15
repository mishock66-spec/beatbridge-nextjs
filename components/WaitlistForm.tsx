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
        <p className="text-orange-500 font-bold text-lg">You&apos;re on the list.</p>
        <p className="text-gray-400 text-sm mt-1">We&apos;ll hit you when Pro drops.</p>
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
        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-full px-5 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/60 text-sm disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-orange-500 text-black font-bold px-6 py-3 rounded-full hover:bg-orange-400 transition-colors text-sm whitespace-nowrap disabled:opacity-50"
      >
        {loading ? "Joining..." : "Get Early Access"}
      </button>
      {error && <p className="text-red-400 text-xs text-center w-full">{error}</p>}
    </form>
  );
}
