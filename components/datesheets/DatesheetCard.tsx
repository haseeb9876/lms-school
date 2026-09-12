import Link from "next/link";
import { CalendarDays, FileImage, ListOrdered, Sparkles } from "lucide-react";
import type { DatesheetSummary } from "@/lib/queries/datesheets";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { audienceLabel } from "@/lib/queries/audiences";

/**
 * One datesheet in the list.
 *
 * A card rather than a table row because the thing people are scanning for
 * is "which one is the current one" — and that is carried by a badge, a
 * date and a title, not by a grid of columns. It also has to read well on a
 * phone, which is where a parent will actually open this.
 */
export function DatesheetCard({ datesheet }: { datesheet: DatesheetSummary }) {
  return (
    <Link
      href={`/datesheets/${datesheet.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-hover sm:flex-row sm:items-center sm:gap-4"
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-brand-soft text-brand"
      >
        <CalendarDays className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-fg group-hover:text-brand">{datesheet.title}</span>
          {datesheet.isLatest && (
            <Badge variant="success">
              <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
              Latest
            </Badge>
          )}
          {datesheet.status === "DRAFT" && <Badge variant="warning">Draft</Badge>}
          {datesheet.isUpcoming && datesheet.status === "PUBLISHED" && (
            <Badge variant="info">Upcoming</Badge>
          )}
        </p>

        <p className="mt-0.5 truncate text-sm text-fg-muted">
          {[datesheet.termName, datesheet.yearName, datesheet.sectionLabel ?? audienceLabel(datesheet.audience)]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
          {datesheet.startsOn && (
            <span className="font-medium text-fg-muted">Begins {formatDate(datesheet.startsOn)}</span>
          )}
          {datesheet.entryCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListOrdered className="h-3 w-3" aria-hidden="true" />
              {datesheet.entryCount} {datesheet.entryCount === 1 ? "paper" : "papers"}
            </span>
          )}
          {datesheet.pageCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <FileImage className="h-3 w-3" aria-hidden="true" />
              {datesheet.pageCount} {datesheet.pageCount === 1 ? "page" : "pages"}
            </span>
          )}
          {datesheet.publishedAt && <span>Published {formatRelativeTime(datesheet.publishedAt)}</span>}
        </p>
      </div>
    </Link>
  );
}
