"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface FilterDefinition {
  /** Search param this control writes to. */
  name: string;
  label: string;
  value?: string;
  placeholder: string;
  options: { value: string; label: string }[];
}

/**
 * The filter row above every list. Each control writes straight to the URL,
 * which is what makes a filtered list shareable and lets the server do the
 * filtering against the database rather than hiding rows already sent to the
 * browser.
 */
export function FilterBar({
  search,
  filters,
  clearHref,
  children,
}: {
  search?: ReactNode;
  filters?: FilterDefinition[];
  /** Rendered when any filter is active. */
  clearHref?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function apply(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    // Changing a filter invalidates whatever page number was showing.
    params.delete("page");

    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
        isPending && "opacity-70 transition-opacity"
      )}
    >
      {search}

      {filters?.map((filter) => (
        <div key={filter.name} className="relative flex min-w-0 flex-col gap-1 sm:w-44">
          <label
            htmlFor={`filter-${filter.name}`}
            className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle"
          >
            {filter.label}
          </label>
          <div className="relative flex items-center">
            <select
              id={`filter-${filter.name}`}
              value={filter.value ?? ""}
              onChange={(event) => apply(filter.name, event.target.value)}
              className={cn(
                "h-9 w-full appearance-none rounded-md border border-line bg-surface pl-3 pr-8 text-sm text-fg",
                "transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              )}
            >
              <option value="">{filter.placeholder}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 h-4 w-4 text-fg-subtle"
              aria-hidden="true"
            />
          </div>
        </div>
      ))}

      {children}

      {clearHref && (
        <Link
          href={clearHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </Link>
      )}
    </div>
  );
}
