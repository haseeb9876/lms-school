import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth/current-user";
import { getBrandingSettings } from "@/lib/branding";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/db";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth();
  const [branding, user] = await Promise.all([
    getBrandingSettings(),
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
  ]);

  return (
    <AppShell role={session.role} userName={user.name} branding={branding}>
      {children}
    </AppShell>
  );
}
