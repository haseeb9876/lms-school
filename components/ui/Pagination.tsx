import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Offset pagination driven entirely by a `page` search param, so the current
 * page survives a refresh and can be linked to. Builds each href from the
 * caller's existing params rather than replacing the query string, which
 * keeps active filters applied as you page through results.
 */
export function Pagination({
  page,
  pageSize,
  total,
  buildHref,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const linkClass =
    "inline-flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg";
  const disabledClass = "pointer-events-none opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
    >
      <p className="text-xs text-fg-subtle">
        Showing <span className="font-medium tabular-nums text-fg-muted">{first}</span>–
        <span className="font-medium tabular-nums text-fg-muted">{last}</span> of{" "}
        <span className="font-medium tabular-nums text-fg-muted">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <Link
          href={buildHref(page - 1)}
          aria-label="Previous page"
          aria-disabled={page <= 1 || undefined}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(linkClass, page <= 1 && disabledClass)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </Link>

        <span className="text-xs tabular-nums text-fg-subtle">
          Page {page} of {totalPages}
        </span>

        <Link
          href={buildHref(page + 1)}
          aria-label="Next page"
          aria-disabled={page >= totalPages || undefined}
          tabIndex={page >= totalPages ? -1 : undefined}
          className={cn(linkClass, page >= totalPages && disabledClass)}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
