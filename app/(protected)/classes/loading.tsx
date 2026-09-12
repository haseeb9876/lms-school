import { HeaderSkeleton } from "@/components/ui/PageSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** Classes render as a card grid, not a table. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton withActions={false} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="mt-1 h-3 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}
