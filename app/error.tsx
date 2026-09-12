"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

/**
 * Catches render errors inside the app. `digest` is the id Next.js also
 * writes to the server log, so quoting it back gives the school office
 * something to search for — the actual message is withheld in production
 * because it can carry internal detail.
 */
export default function AppError({
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
    <ErrorScreen
      icon={AlertTriangle}
      tone="danger"
      title="Something went wrong"
      description="This page didn't load properly. Trying again usually fixes it — if it keeps happening, send the reference below to the school office."
      reference={error.digest}
      actions={[
        { label: "Try again", onClick: reset },
        { label: "Go to dashboard", href: "/dashboard", variant: "secondary" },
      ]}
    />
  );
}
