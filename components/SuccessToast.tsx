"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function SuccessToast() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (params.get("success") === "true") {
      toast.success("Welcome to BeatBridge Pro! Your trial has started.", {
        duration: 6000,
        icon: "🎉",
        style: {
          background: "#1a1a1a",
          color: "#ffffff",
          border: "1px solid rgba(249,115,22,0.3)",
        },
      });
      router.replace("/dashboard");
    }
  }, [params, router]);

  return null;
}
