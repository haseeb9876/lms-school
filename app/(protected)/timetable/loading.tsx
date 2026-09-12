import { HeaderSkeleton } from "@/components/ui/PageSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton withActions={false} />
      {/* Day columns on desktop, a day list on phones — mirrors TimetableGrid. */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, d) => (
          <div key={d} className="flex flex-col gap-2">
            <Skeleton className="h-7 w-full rounded-md" />
            {Array.from({ length: 5 }).map((_, s) => (
              <Skeleton key={s} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 lg:hidden">
        {Array.from({ length: 3 }).map((_, d) => (
          <div key={d} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 4 }).map((_, s) => (
              <Skeleton key={s} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
