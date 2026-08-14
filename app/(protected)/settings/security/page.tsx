import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";
import { TwoFactorSettings } from "@/components/settings/TwoFactorSettings";

export default async function SecuritySettingsPage() {
  const session = await requireAuth();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Account security</h1>
        <p className="text-sm text-neutral-500">Manage your password and two-factor authentication.</p>
      </div>
      <PasswordChangeForm />
      <TwoFactorSettings initiallyEnabled={user.twoFactorEnabled} />
    </div>
  );
}
