import { StatGridSkeleton, CardSkeleton, ChartSkeleton } from "@/components/ui/PageSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80 max-w-[70vw]" />
      </div>
      <StatGridSkeleton />
      <ChartSkeleton />
      <CardSkeleton lines={4} />
    </div>
  );
}
