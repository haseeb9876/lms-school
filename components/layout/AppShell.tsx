import type { ReactNode } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { NavLinks } from "./NavLinks";
import { MobileTabBar } from "./MobileTabBar";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { readableTextColor } from "@/lib/color";
import type { BrandingSettings } from "@/lib/branding";
import type { NotificationFeed } from "@/lib/notifications";

/**
 * The single shell used for every role — nav items are filtered from one
 * config array rather than each role getting its own hand-built shell,
 * which is what made the old app feel like three different products.
 */
export function AppShell({
  role,
  userName,
  branding,
  notifications,
  children,
}: {
  role: Role;
  userName: string;
  branding: BrandingSettings;
  notifications: NotificationFeed;
  children: ReactNode;
}) {
  const mark = branding.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={branding.logoUrl} alt="" aria-hidden="true" className="h-8 w-8 flex-none rounded-md object-cover" />
  ) : (
    <div
      aria-hidden="true"
      className="flex h-8 w-8 flex-none items-center justify-center rounded-md text-sm font-bold"
      style={{ background: branding.primaryColor, color: readableTextColor(branding.primaryColor) }}
    >
      {branding.schoolName.charAt(0).toUpperCase()}
    </div>
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
        <Link href="/" className="flex items-center gap-2 rounded-md px-1 py-0.5">
          {mark}
          <span className="truncate text-sm font-semibold text-fg">{branding.schoolName}</span>
        </Link>

        <div className="scrollbar-subtle -mr-2 flex-1 overflow-y-auto pr-2">
          <NavLinks role={role} />
        </div>

        <UserMenu name={userName} role={role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-print-hide
          className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur-sm"
        >
          <Link href="/" className="flex items-center gap-2 md:hidden">
            {mark}
            <span className="truncate text-sm font-semibold text-fg">{branding.schoolName}</span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell feed={notifications} />
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

      <MobileTabBar role={role} />
    </div>
  );
}
