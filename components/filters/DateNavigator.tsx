"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Date picker with day-step arrows, used wherever a screen is "about one
 * day" (a register, a day's timetable). The value lives in the URL so a
 * particular day can be linked to and the back button steps through the
 * days you actually looked at.
 */
export function DateNavigator({
  value,
  paramName = "date",
  max,
  className,
}: {
  /** `YYYY-MM-DD`. */
  value: string;
  paramName?: string;
  /** Usually today — attendance can't be taken for a day that hasn't happened. */
  max?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function go(next: string) {
    if (max && next > max) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, next);
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  }

  function shift(days: number) {
    // Parsed as UTC so stepping a day never lands on the same date twice
    // across a daylight-saving boundary.
    const date = new Date(`${value}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    go(date.toISOString().slice(0, 10));
  }

  const atMax = Boolean(max && value >= max);

  const buttonClass =
    "flex h-9 w-9 flex-none items-center justify-center rounded-md border border-line bg-surface text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className={cn("flex items-center gap-1.5", isPending && "opacity-70", className)}>
      <button type="button" onClick={() => shift(-1)} aria-label="Previous day" className={buttonClass}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <input
        type="date"
        value={value}
        max={max}
        onChange={(event) => event.target.value && go(event.target.value)}
        aria-label="Date"
        className="h-9 rounded-md border border-line bg-surface px-3 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />

      <button
        type="button"
        onClick={() => shift(1)}
        disabled={atMax}
        aria-label="Next day"
        className={buttonClass}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
