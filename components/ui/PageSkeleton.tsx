import { Skeleton } from "./Skeleton";
import { cn } from "@/lib/cn";

/**
 * Page-shaped loading states.
 *
 * Next.js renders a segment's `loading.tsx` the instant a navigation starts,
 * before any server work happens. Without one the browser has nothing to
 * show, so it keeps painting the *previous* page until the server responds —
 * which is exactly what "the app feels slow" means in practice, even when
 * the work itself is unavoidable.
 *
 * Each skeleton mirrors the real page's structure (same header, same stat
 * grid, same row height) so content lands in place instead of shoving the
 * layout around when it arrives.
 */

export function HeaderSkeleton({ withActions = true }: { withActions?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-[70vw]" />
      </div>
      {withActions && <Skeleton className="h-9 w-32" />}
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface-raised p-4">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="mt-3 h-7 w-16" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function FilterBarSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Skeleton className="h-9 w-full sm:w-64" />
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full sm:w-44" />
      ))}
    </div>
  );
}

/**
 * Matches DataTable's two layouts: stacked cards below `md`, a real table
 * above it. A single shape would mis-size on one of the two.
 */
export function DataTableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>

      <div className="flex flex-col gap-2 md:hidden">
        {Array.from({ length: Math.min(rows, 6) }).map((_, i) => (
          <div key={i} className="rounded-lg border border-line bg-surface-raised p-3.5">
            <Skeleton className="h-4 w-40" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-line bg-surface-raised md:block">
        <div className="flex gap-4 border-b border-line bg-surface-sunken px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className={cn("h-3 flex-1", i === 0 && "max-w-[28%]")} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0">
            {Array.from({ length: columns }).map((_, c) => (
              <div key={c} className={cn("flex flex-1 items-center gap-2.5", c === 0 && "max-w-[28%]")}>
                {c === 0 && <Skeleton className="h-8 w-8 flex-none rounded-full" />}
                <Skeleton className="h-3.5 flex-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface-raised p-5", className)}>
      <Skeleton className="h-4 w-36" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface-raised p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 max-w-[60vw]" />
        </div>
        <Skeleton className="h-7 w-20" />
      </div>
      {/* Bars of varying height read as a chart rather than a grey slab. */}
      <div className="mt-6 flex h-48 items-end gap-2">
        {[45, 70, 55, 85, 62, 78, 50, 90, 66, 74, 58, 82].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/** The default: a header, some stats, and a table. Covers most list pages. */
export function ListPageSkeleton({
  stats = 0,
  filters = 2,
  rows = 8,
  columns = 5,
}: {
  stats?: number;
  filters?: number;
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      {stats > 0 && <StatGridSkeleton count={stats} />}
      {filters > 0 && <FilterBarSkeleton count={filters} />}
      <DataTableSkeleton rows={rows} columns={columns} />
    </div>
  );
}

export function DetailPageSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-56" />
      </div>
      <div className="flex items-center gap-4 rounded-lg border border-line bg-surface-raised p-5">
        <Skeleton className="h-14 w-14 flex-none rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <StatGridSkeleton count={stats} />
      <div className="grid gap-4 lg:grid-cols-2">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>
    </div>
  );
}
