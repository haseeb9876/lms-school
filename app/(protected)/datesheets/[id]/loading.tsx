import { HeaderSkeleton, CardSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <HeaderSkeleton />
      <CardSkeleton lines={6} />
      <CardSkeleton lines={4} />
    </div>
  );
}
