"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { Role } from "@prisma/client";
import { NavLinks } from "./NavLinks";

export function MobileNav({ role, schoolName }: { role: Role; schoolName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-4 bg-white p-4 shadow-raised">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-900">{schoolName}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <NavLinks role={role} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
