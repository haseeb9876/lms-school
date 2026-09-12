import { HeaderSkeleton, StatGridSkeleton, CardSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <StatGridSkeleton />
      <CardSkeleton lines={6} />
    </div>
  );
}
