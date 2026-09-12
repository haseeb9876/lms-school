import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/current-user";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/dashboard");

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use the CNIC and password issued by the school office."
      footer={
        <Link href="/" className="font-medium text-brand underline underline-offset-2">
          Back to welcome
        </Link>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
