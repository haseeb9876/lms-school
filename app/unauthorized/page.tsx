import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-neutral-900">You don&apos;t have access to this page</h1>
        <p className="text-sm text-neutral-500">
          Your account doesn&apos;t have permission to view this. If you think this is a mistake, contact the school principal.
        </p>
        <Link href="/" className="text-sm font-medium text-brand underline underline-offset-2">
          Back to your dashboard
        </Link>
      </div>
    </div>
  );
}
