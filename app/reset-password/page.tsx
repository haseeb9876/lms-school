import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Alert } from "@/components/ui/Alert";
import { readParam, type RawSearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const token = readParam(await searchParams, "token");

  return (
    <AuthShell
      title="Set a new password"
      subtitle={token ? "Choose something only you know." : undefined}
      footer={
        <Link href="/login" className="font-medium text-brand underline underline-offset-2">
          Back to sign in
        </Link>
      }
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert variant="warning" title="This link is incomplete">
          Open the link from your email exactly as it was sent, or{" "}
          <Link href="/forgot-password" className="underline underline-offset-2">
            request a new one
          </Link>
          .
        </Alert>
      )}
    </AuthShell>
  );
}
