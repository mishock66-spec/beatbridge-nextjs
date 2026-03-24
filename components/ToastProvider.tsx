"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: "#111111",
          color: "#ffffff",
          border: "1px solid #1f1f1f",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 500,
        },
        success: {
          iconTheme: { primary: "#f97316", secondary: "#111111" },
        },
      }}
    />
  );
}
