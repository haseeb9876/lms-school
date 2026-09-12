import { ListPageSkeleton } from "@/components/ui/PageSkeleton";

/**
 * Fallback for any protected segment without its own loading state. Next.js
 * shows this the moment a navigation begins, so a click always produces an
 * immediate visual response instead of leaving the previous page on screen.
 */
export default function Loading() {
  return <ListPageSkeleton stats={4} filters={2} />;
}
