import { HeaderSkeleton, FilterBarSkeleton, CardSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <FilterBarSkeleton count={2} />
      <CardSkeleton lines={2} />
      <CardSkeleton lines={2} />
      <CardSkeleton lines={2} />
    </div>
  );
}
