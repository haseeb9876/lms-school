import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth/current-user";
import { getBrandingSettings } from "@/lib/branding";
import { getNotificationFeed } from "@/lib/notifications";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { prisma } from "@/lib/db";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth();

  const [branding, user, notifications] = await Promise.all([
    getBrandingSettings(),
    prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { name: true },
    }),
    getNotificationFeed(session.userId),
  ]);

  return (
    <ToastProvider>
      <AppShell
        role={session.role}
        userName={user.name}
        branding={branding}
        notifications={notifications}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
