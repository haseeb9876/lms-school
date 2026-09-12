import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { listDeviceSessions } from "@/lib/queries/sessions";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";
import { TwoFactorSettings } from "@/components/settings/TwoFactorSettings";
import { SignedInDevices } from "@/components/settings/SignedInDevices";

export const metadata: Metadata = { title: "Account security" };

export default async function SecuritySettingsPage() {
  const session = await requireAuth();

  const [user, devices] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { twoFactorEnabled: true },
    }),
    listDeviceSessions(session.userId, session.sessionId),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Account security</h1>
        <p className="text-sm text-fg-subtle">
          Manage your password, two-factor authentication, and the devices signed in to your
          account.
        </p>
      </div>
      <PasswordChangeForm />
      <SignedInDevices devices={devices} />
      <TwoFactorSettings initiallyEnabled={user.twoFactorEnabled} />
    </div>
  );
}
