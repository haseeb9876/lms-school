import { ListPageSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return <ListPageSkeleton filters={0} rows={6} columns={4} />;
}
