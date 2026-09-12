import { ListPageSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return <ListPageSkeleton stats={4} filters={0} rows={8} columns={6} />;
}
