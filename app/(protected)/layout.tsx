import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth/current-user";
import { getBrandingSettings } from "@/lib/branding";
import { getShellUser } from "@/lib/queries/shell";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { SplashScreen } from "@/components/branding/SplashScreen";
import { BrandingChangedNotice } from "@/components/pwa/BrandingChangedNotice";

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
      {/* Painted with the first frame and removed once the app is ready.
          Once per session, so it covers a launch and not every click. */}
      <SplashScreen />
      <AppShell
        role={session.role}
        userName={user.name}
        branding={branding}
        unreadCount={user.unreadCount}
        soundEnabled={user.soundEnabled}
        notificationsEnabled={user.notificationsEnabled}
        device={session.device}
      >
        {children}
        {/* iPhones cannot refresh a home-screen icon on their own; this says
            so once, and only when the branding actually changed. */}
        <BrandingChangedNotice version={branding.version} />
      </AppShell>
    </ToastProvider>
  );
}
