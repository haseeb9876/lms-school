"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { CONTROL_CLASS } from "./Field";

/**
 * Writes the query into the URL (`?q=…`) instead of holding it in component
 * state, so a filtered list can be shared, bookmarked and restored by the
 * back button — and so the filtering itself happens on the server against
 * the database rather than against whatever subset was already downloaded.
 */
export function SearchInput({
  placeholder = "Search…",
  paramName = "q",
  className,
}: {
  placeholder?: string;
  paramName?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(urlValue);

  // Re-sync when the URL changes from outside this input (back button, a
  // "clear filters" link) — without this the box would keep showing a stale
  // query after navigation.
  const lastPushed = useRef(urlValue);
  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  function commit(next: string) {
    lastPushed.current = next;
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(paramName, next);
    else params.delete(paramName);
    // Any change to the filter invalidates the current page number.
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  // Debounced so typing "Muhammad" issues one query rather than eight.
  useEffect(() => {
    if (value === lastPushed.current) return;
    const timer = setTimeout(() => commit(value), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-fg-subtle" aria-hidden="true" />
      <input
        type="search"
        role="searchbox"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(CONTROL_CLASS, "h-9 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden")}
      />
      <span className="absolute right-3 flex items-center">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-fg-subtle" aria-hidden="true" />
        ) : (
          value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                commit("");
              }}
              aria-label="Clear search"
              className="rounded text-fg-subtle transition-colors hover:text-fg"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )
        )}
      </span>
    </div>
  );
}
