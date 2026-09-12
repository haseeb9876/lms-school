import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth/current-user";
import { getBrandingSettings } from "@/lib/branding";
import { getShellUser } from "@/lib/queries/shell";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * This layout runs before every page in the app, so its cost is charged to
 * every single navigation. It is deliberately down to one database query:
 * branding is cached, and the shell user (name + unread badge count) comes
 * from a single filtered relation count.
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth();

  const [branding, user] = await Promise.all([
    getBrandingSettings(),
    getShellUser(session.userId),
  ]);

  return (
    <ToastProvider>
      <AppShell
        role={session.role}
        userName={user.name}
        branding={branding}
        unreadCount={user.unreadCount}
        soundEnabled={user.soundEnabled}
        notificationsEnabled={user.notificationsEnabled}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
