"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#080808", color: "#ffffff", fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>Something went wrong</h2>
          <button
            onClick={reset}
            style={{ padding: "0.5rem 1.5rem", background: "#f97316", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
