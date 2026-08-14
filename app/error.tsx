"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-neutral-900">Something went wrong</h1>
        <p className="text-sm text-neutral-500">
          {error.digest ? `Reference: ${error.digest}. ` : ""}
          Try again, or contact support if it keeps happening.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
