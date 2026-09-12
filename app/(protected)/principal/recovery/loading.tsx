import { HeaderSkeleton, CardSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <HeaderSkeleton withActions={false} />
      <CardSkeleton lines={2} />
    </div>
  );
}
