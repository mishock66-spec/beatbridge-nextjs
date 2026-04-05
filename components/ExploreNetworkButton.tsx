"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function ExploreNetworkButton({ slug }: { slug: string }) {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  const handleClick = () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(
        `/sign-in?redirect_url=${encodeURIComponent(`/artist/${slug}`)}&msg=trial`
      );
    } else {
      router.push(`/artist/${slug}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="block w-full text-center text-sm font-semibold bg-gradient-to-br from-[#f97316] to-[#f85c00] text-white px-4 py-3 rounded-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
    >
      Explore Network →
    </button>
  );
}
