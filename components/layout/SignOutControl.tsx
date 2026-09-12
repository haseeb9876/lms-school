"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import type { DeviceClass } from "@/lib/auth/session";

/**
 * Signing out, with a confirmation whose weight depends on the device.
 *
 * On a phone this is the *only* thing that ends a session — there is no
 * timeout to fall back on — so it is deliberately not a one-tap action
 * sitting next to the navigation. A teacher whose thumb catches the wrong
 * row is then facing a 13-digit CNIC and a password at the classroom door,
 * which is exactly the friction the phone policy exists to remove. The
 * confirmation says what will be needed to get back in, so the choice is
 * made with that in front of them.
 *
 * On a desktop the same dialog appears but reads differently: the session
 * was going to end within the day regardless, so signing out early is
 * routine rather than consequential.
 */
export function SignOutControl({
  device,
  variant = "menu",
  onDone,
}: {
  device: DeviceClass;
  /** "menu" for the sidebar dropdown, "sheet" for the phone menu. */
  variant?: "menu" | "sheet";
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isPhone = device === "MOBILE";

  async function signOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      onDone?.();
      // router.refresh() clears the cached Server Component tree — without
      // it the signed-in shell can persist behind the login page.
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        role={variant === "menu" ? "menuitem" : undefined}
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md text-sm text-danger transition-colors hover:bg-danger-soft",
          variant === "menu" ? "px-2.5 py-2" : "px-3 py-2.5 font-medium"
        )}
      >
        <LogOut className="h-4 w-4 flex-none" aria-hidden="true" />
        Sign out
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Sign out?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
              Stay signed in
            </Button>
            <Button variant="danger" onClick={signOut} loading={loading}>
              Sign out
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-fg-muted">
          {isPhone
            ? "You'll need your CNIC and password to sign in again on this phone. If you leave it signed in, you'll stay signed in — this app doesn't sign phones out on its own."
            : "You'll need your CNIC and password to sign in again."}
        </p>
      </Dialog>
    </>
  );
}
