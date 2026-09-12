import { ListPageSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return <ListPageSkeleton filters={1} rows={8} columns={5} />;
}
