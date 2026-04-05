"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

interface AccessResult {
  allowed: boolean;
  reason?: string;
  trialDaysLeft?: number;
}

export default function AuthGateClient({
  children,
  redirectUrl,
}: {
  children: React.ReactNode;
  redirectUrl: string;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [access, setAccess] = useState<AccessResult | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace(
        `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}&msg=trial`
      );
      return;
    }

    if (checkedRef.current) return;
    checkedRef.current = true;

    fetch("/api/user/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    })
      .then((r) => r.json())
      .then((data: AccessResult) => {
        if (!data.allowed) {
          router.replace("/pricing?trial_expired=1");
        } else {
          setAccess(data);
        }
      })
      .catch(() => {
        setAccess({ allowed: true, reason: "error" });
      });
  }, [isLoaded, isSignedIn, user?.id, redirectUrl, router]);

  if (!isLoaded || !access) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
