import Link from "next/link";
import { cn } from "@/lib/cn";

export interface TabItem {
  label: string;
  href: string;
  count?: number;
}

/**
 * Link-based rather than state-based, so the selected tab lives in the URL.
 * That makes a tab shareable, bookmarkable and survivable across a refresh,
 * and lets each tab's panel be its own server-rendered route instead of
 * every panel's data being fetched up front.
 */
export function Tabs({ items, current, className }: { items: TabItem[]; current: string; className?: string }) {
  return (
    <div className={cn("scrollbar-subtle -mb-px overflow-x-auto border-b border-line", className)}>
      <nav className="flex min-w-max gap-1" aria-label="Sections">
        {items.map((item) => {
          const active = item.href === current;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-fg-subtle hover:border-line-strong hover:text-fg"
              )}
            >
              {item.label}
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    active ? "bg-brand-soft text-brand" : "bg-surface-hover text-fg-subtle"
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Compact pill switcher for narrow filters (a date range, a status filter)
 * where a full underlined tab bar would be visually heavy.
 */
export function SegmentedControl({
  items,
  current,
  className,
}: {
  items: { label: string; href: string }[];
  current: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-sunken p-0.5", className)}>
      {items.map((item) => {
        const active = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              active ? "bg-surface text-fg shadow-soft" : "text-fg-subtle hover:text-fg"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
