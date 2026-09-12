import { HeaderSkeleton, CardSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <CardSkeleton lines={6} />
      <CardSkeleton lines={3} />
    </div>
  );
}
