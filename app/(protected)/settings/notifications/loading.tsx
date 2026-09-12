import { HeaderSkeleton, CardSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <HeaderSkeleton withActions={false} />
      <CardSkeleton lines={3} />
      <CardSkeleton lines={6} />
    </div>
  );
}
