import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200 text-neutral-600">
          <Compass className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-neutral-900">Page not found</h1>
        <p className="text-sm text-neutral-500">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
        <Link href="/" className="text-sm font-medium text-brand underline underline-offset-2">
          Back to your dashboard
        </Link>
      </div>
    </div>
  );
}
