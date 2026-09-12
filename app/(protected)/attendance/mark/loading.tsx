import { HeaderSkeleton, FilterBarSkeleton } from "@/components/ui/PageSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** The register is a list of student rows with status buttons. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton withActions={false} />
      <FilterBarSkeleton count={1} />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-line bg-surface-raised p-3"
          >
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-8 w-8 flex-none rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-none gap-1">
              {Array.from({ length: 4 }).map((_, b) => (
                <Skeleton key={b} className="h-9 w-9 sm:w-11" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
