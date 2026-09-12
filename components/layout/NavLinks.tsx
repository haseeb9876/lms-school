"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { isNavItemActive, navGroupsForRole } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  // NAV_GROUPS (and its icon components) is imported directly here rather
  // than passed as a prop from a Server Component — React can't serialize
  // component/function references across that boundary.
  const groups = navGroupsForRole(role);

  return (
    <nav className="flex flex-col gap-5">
      {groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-1">
          {group.label && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-fg-muted hover:bg-surface-hover hover:text-fg"
                )}
              >
                <Icon
                  className={cn("h-4 w-4 flex-none", active ? "text-brand" : "text-fg-subtle group-hover:text-fg")}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
