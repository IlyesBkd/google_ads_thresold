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
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080808", color: "#F5F5F5", fontFamily: "system-ui" }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>Something went wrong</h2>
            <button onClick={reset} style={{ padding: "10px 20px", background: "#4285F4", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
