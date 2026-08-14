import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import { NavLinks } from "./NavLinks";
import { MobileNav } from "./MobileNav";
import { UserMenu } from "./UserMenu";
import { readableTextColor } from "@/lib/color";
import type { BrandingSettings } from "@/lib/branding";

/**
 * The single shell used for every role — nav items are filtered from one
 * config array rather than each role getting its own hand-built shell,
 * which is what made the old app feel like three different products.
 */
export function AppShell({
  role,
  userName,
  branding,
  children,
}: {
  role: Role;
  userName: string;
  branding: BrandingSettings;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-none flex-col gap-6 border-r border-neutral-200 bg-white p-4 md:flex">
        <div className="flex items-center gap-2 px-1">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.schoolName} className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <div
              className="flex h-8 w-8 flex-none items-center justify-center rounded-md text-sm font-bold"
              style={{ background: branding.primaryColor, color: readableTextColor(branding.primaryColor) }}
            >
              {branding.schoolName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="truncate text-sm font-semibold text-neutral-900">{branding.schoolName}</span>
        </div>

        <div className="flex-1">
          <NavLinks role={role} />
        </div>

        <UserMenu name={userName} role={role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <MobileNav role={role} schoolName={branding.schoolName} />
          <span className="truncate text-sm font-semibold text-neutral-900">{branding.schoolName}</span>
        </header>

        <main className="flex-1 bg-neutral-50 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
