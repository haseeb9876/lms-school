"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, ShieldCheck, User } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SignOutControl } from "./SignOutControl";
import type { DeviceClass } from "@/lib/auth/session";
import type { Theme } from "@/components/theme/constants";
import { cn } from "@/lib/cn";

const ROLE_LABELS: Record<string, string> = {
  PRINCIPAL: "Principal",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Guardian",
};

export function UserMenu({
  name,
  role,
  device,
  theme,
}: {
  name: string;
  role: string;
  device: DeviceClass;
  theme: Theme;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex w-full items-center gap-2.5 rounded-md border border-line bg-surface-sunken p-2 text-left transition-colors hover:bg-surface-hover"
      >
        <Avatar name={name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{name}</p>
          <p className="truncate text-xs text-fg-subtle">{ROLE_LABELS[role] ?? role}</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 flex-none text-fg-subtle" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute bottom-full left-0 z-50 mb-2 w-full min-w-56 animate-scale-in",
            "overflow-hidden rounded-xl border border-line bg-surface-raised shadow-overlay"
          )}
        >
          <div className="border-b border-line px-3 py-3">
            <p className="truncate text-sm font-semibold text-fg">{name}</p>
            <p className="truncate text-xs text-fg-subtle">{ROLE_LABELS[role] ?? role}</p>
          </div>

          <div className="p-1">
            <Link
              href="/settings/security"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Account security
            </Link>
            <Link
              href="/settings/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              My profile
            </Link>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
            <span className="text-xs text-fg-subtle">Appearance</span>
            <ThemeToggle current={theme} />
          </div>

          <div className="border-t border-line p-1">
            <SignOutControl device={device} onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
