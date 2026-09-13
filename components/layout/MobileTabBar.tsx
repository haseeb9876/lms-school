"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import type { Role } from "@prisma/client";
import { isNavItemActive, mobilePrimaryItems } from "@/lib/nav";
import { NavLinks } from "./NavLinks";
import { SignOutControl } from "./SignOutControl";
import type { DeviceClass } from "@/lib/auth/session";
import type { Theme } from "@/components/theme/constants";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/cn";

/**
 * Phone navigation as a bottom tab bar rather than a hamburger menu.
 *
 * The people using this app on a phone are doing short, repeated tasks —
 * a teacher marking a register at the classroom door, a parent checking a
 * fee status. A bottom bar keeps those destinations reachable one-thumbed
 * and always visible; a hamburger hides every one of them behind an extra
 * tap at the top of the screen, which is the hardest place to reach.
 */
export function MobileTabBar({
  role,
  device,
  theme,
}: {
  role: Role;
  device: DeviceClass;
  theme: Theme;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = mobilePrimaryItems(role);

  return (
    <>
      <nav
        aria-label="Primary"
        data-print-hide
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface-raised md:hidden",
          // Keeps the bar clear of the iOS home indicator.
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        {primary.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-brand" : "text-fg-subtle"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{item.label.replace(/^My /, "")}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium text-fg-subtle"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 animate-fade-in bg-black/50"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] animate-slide-up overflow-y-auto rounded-t-xl border-t border-line bg-surface-raised p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-overlay">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">Menu</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="-m-1 rounded-md p-2 text-fg-subtle hover:bg-surface-hover hover:text-fg"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <NavLinks role={role} onNavigate={() => setMoreOpen(false)} />
            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm text-fg-muted">Appearance</span>
              <ThemeToggle current={theme} />
            </div>

            {/* The sidebar's account menu is desktop-only, so without this
                a phone user had no way to sign out anywhere in the app. */}
            <div className="mt-2 border-t border-line pt-2">
              <SignOutControl device={device} variant="sheet" onDone={() => setMoreOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
