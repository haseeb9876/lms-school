import { ListPageSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return <ListPageSkeleton filters={2} rows={10} columns={6} />;
}
