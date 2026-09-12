import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/PageHeader";
import { RecoveryDesk } from "@/components/recovery/RecoveryDesk";

export const metadata: Metadata = { title: "Password desk" };

export default async function AccountRecoveryPage() {
  await requireAuth(["PRINCIPAL"]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Password desk"
        description="For anyone who comes to the office unable to sign in — students, teachers and guardians."
      />
      <RecoveryDesk />
    </div>
  );
}
