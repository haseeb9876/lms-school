"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

export function UserMenu({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-neutral-200 text-neutral-600">
        <User className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">{name}</p>
        <p className="truncate text-xs capitalize text-neutral-500">{role.toLowerCase()}</p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        aria-label="Sign out"
        className="flex-none rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
