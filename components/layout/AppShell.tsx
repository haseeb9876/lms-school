import type { ReactNode } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { NavLinks } from "./NavLinks";
import { MobileTabBar } from "./MobileTabBar";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { NotificationWatcher } from "./NotificationWatcher";
import { BrandMark } from "@/components/branding/BrandMark";
import type { BrandingSettings } from "@/lib/branding";
import type { DeviceClass } from "@/lib/auth/session";
import type { Theme } from "@/components/theme/constants";

/**
 * The single shell used for every role — nav items are filtered from one
 * config array rather than each role getting its own hand-built shell,
 * which is what made the old app feel like three different products.
 */
export function AppShell({
  role,
  userName,
  branding,
  unreadCount,
  soundEnabled,
  notificationsEnabled,
  device,
  theme,
  children,
}: {
  role: Role;
  userName: string;
  branding: BrandingSettings;
  unreadCount: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  device: DeviceClass;
  theme: Theme;
  children: ReactNode;
}) {
  const mark = (
    <BrandMark
      logoUrl={branding.logoUrl}
      schoolName={branding.schoolName}
      primaryColor={branding.primaryColor}
      size="sm"
    />
  );

  return (
    <div className="flex min-h-dvh bg-surface-sunken">
      {/* Keyboard users shouldn't have to tab through the whole sidebar on
          every page just to reach the content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-fg"
      >
        Skip to content
      </a>

      <aside
        data-print-hide
        className="sticky top-0 hidden h-dvh w-64 flex-none flex-col gap-6 border-r border-line bg-surface p-4 md:flex"
      >
        <Link href="/dashboard" className="flex items-center gap-2 rounded-md px-1 py-0.5">
          {mark}
          <span className="truncate text-sm font-semibold text-fg">{branding.schoolName}</span>
        </Link>

        <div className="scrollbar-subtle -mr-2 flex-1 overflow-y-auto pr-2">
          <NavLinks role={role} />
        </div>

        <UserMenu name={userName} role={role} device={device} theme={theme} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-print-hide
          className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur-sm"
        >
          {/*
            min-w-0 on both the link and the label is what makes `truncate`
            work. A flex child will not shrink below its content width
            without it, so a long school name pushed the whole header wider
            than the screen — 55px of horizontal overflow on a 375px phone,
            which dragged every page sideways and pushed the bell off-screen.
          */}
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
            {mark}
            <span className="min-w-0 truncate text-sm font-semibold text-fg">
              {branding.schoolName}
            </span>
          </Link>

          <div className="ml-auto flex flex-none items-center gap-1">
            <NotificationBell unreadCount={unreadCount} />
          </div>
        </header>

        <main
          id="main-content"
          // Bottom padding clears the fixed mobile tab bar; without it the
          // last row of any list sits underneath it and can't be tapped.
          className="flex-1 p-4 pb-24 md:p-8 md:pb-8"
        >
          {children}
        </main>
      </div>

      <MobileTabBar role={role} device={device} theme={theme} />

      {/* Nothing is polled for at all when alerts are switched off. */}
      {notificationsEnabled && (
        <NotificationWatcher initialUnread={unreadCount} soundEnabled={soundEnabled} />
      )}
    </div>
  );
}
