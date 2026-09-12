import { HeaderSkeleton, CardSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton withActions={false} />
      <CardSkeleton lines={3} />
      <CardSkeleton lines={4} />
    </div>
  );
}
