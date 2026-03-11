"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    const list = JSON.parse(localStorage.getItem("bb_waitlist") || "[]");
    if (!list.includes(email.trim())) {
      list.push(email.trim());
      localStorage.setItem("bb_waitlist", JSON.stringify(list));
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center py-4">
        <div className="text-3xl mb-3">🔥</div>
        <p className="text-amber-400 font-bold text-lg">You&apos;re on the list.</p>
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
        className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-full px-5 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-400/60 text-sm"
      />
      <button
        type="submit"
        className="bg-amber-400 text-black font-bold px-6 py-3 rounded-full hover:bg-amber-300 transition-colors text-sm whitespace-nowrap"
      >
        Get Early Access
      </button>
    </form>
  );
}
