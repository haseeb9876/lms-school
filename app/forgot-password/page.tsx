import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/current-user";
import { getBrandingSettings } from "@/lib/branding";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  // Already signed in: there is nothing to recover.
  if (await getCurrentSession()) redirect("/settings/security");

  const branding = await getBrandingSettings();

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll help you get back into your account."
      footer={
        <Link href="/login" className="font-medium text-brand underline underline-offset-2">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm officePhone={branding.phone} />
    </AuthShell>
  );
}
