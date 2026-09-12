"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * The last line of defence: errors thrown by the root layout itself, before
 * any of the app's own chrome exists.
 *
 * It has to render its own <html> and <body> — the layout that would
 * normally provide them is precisely what failed. For the same reason it
 * can't use the app's components or Tailwind classes, since the failure may
 * have been in loading them, so the styling here is inline and self
 * contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#fafaf8",
          color: "#1a1815",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              margin: "0 auto 1.25rem",
              borderRadius: "1rem",
              background: "#fbeae7",
              color: "#c23b2c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={28} aria-hidden="true" />
          </div>

          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            The portal couldn&apos;t start
          </h1>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#5c584b", margin: "0 0 1.25rem" }}>
            Something failed before the page could load. Please try again in a moment, or contact
            the school office if it continues.
          </p>

          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "#7c7768",
                border: "1px solid #e4e2db",
                background: "#ffffff",
                borderRadius: "0.375rem",
                padding: "0.5rem 0.75rem",
                margin: "0 0 1.25rem",
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              height: "2.5rem",
              padding: "0 1rem",
              borderRadius: "0.375rem",
              border: "none",
              background: "#0e6e68",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
