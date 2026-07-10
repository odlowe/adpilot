"use client";

import { useEffect } from "react";

/**
 * Last-resort error screen. If the whole app crashes in the browser, this
 * renders instead of a blank page — and quietly reports what happened.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/monitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `${error.name}: ${error.message}${error.digest ? ` (digest ${error.digest})` : ""}`,
        url: window.location.href,
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ color: "#0f2a52", fontSize: 22, margin: 0 }}>Something went wrong on our end</h1>
          <p style={{ color: "#64748b", maxWidth: 420, margin: 0 }}>
            The error has been reported automatically. Your campaigns and data are safe.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 8,
              padding: "10px 22px",
              borderRadius: 12,
              border: "none",
              background: "#059669",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
