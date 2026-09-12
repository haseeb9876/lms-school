import Link from "next/link";
import type { Role } from "@prisma/client";
import { CalendarClock, ChevronRight } from "lucide-react";
import { getUpcomingDatesheet } from "@/lib/queries/datesheets";
import { formatDate } from "@/lib/format";

/**
 * "Your examinations start on Tuesday", on the dashboard.
 *
 * During exam season this is the single most important thing on a student's
 * or a parent's landing page, and a notification that arrived a fortnight
 * ago has long since been swiped away. A datesheet buried one navigation
 * deep is a datesheet people miss, so the dashboard carries it for as long
 * as the examinations have not started — and then stops, rather than
 * becoming permanent furniture nobody reads.
 */
export async function UpcomingDatesheetBanner({
  userId,
  role,
}: {
  userId: string;
  role: Role;
}) {
  // One query, not two: see getUpcomingDatesheet. This renders on every
  // dashboard, so a spare round trip here is paid by every user, every visit.
  const datesheet = await getUpcomingDatesheet(userId, role, startOfToday());
  if (!datesheet) return null;

  const days = daysUntil(datesheet.startsOn);

  return (
    <Link
      href={`/datesheets/${datesheet.id}`}
      className="group flex items-center gap-3 rounded-xl border border-info/25 bg-info-soft px-4 py-3 transition-colors hover:border-info/40"
    >
      <CalendarClock className="h-5 w-5 flex-none text-info" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{datesheet.title}</p>
        <p className="truncate text-xs text-fg-muted">
          {days === 0
            ? "Examinations begin today"
            : days === 1
              ? "Examinations begin tomorrow"
              : `Examinations begin ${formatDate(datesheet.startsOn)} — ${days} days away`}
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 flex-none text-fg-subtle transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Whole days between today and the start, counted on calendar dates rather
 * than elapsed milliseconds — "tomorrow" must mean the next date on the
 * calendar, not 24 hours from this instant.
 */
function daysUntil(date: Date): number {
  const today = startOfToday();
  const target = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86_400_000));
}
