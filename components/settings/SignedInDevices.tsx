"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Laptop, LogOut, Smartphone } from "lucide-react";
import { revokeDevice, revokeOtherDevices } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type { DeviceSession } from "@/lib/queries/sessions";

/**
 * Every browser currently signed in to this account, and a way to end any
 * of them.
 *
 * This panel is what makes the phone policy defensible. Phone sessions are
 * deliberately open-ended — a teacher marking a register at a classroom
 * door should not be retyping a 13-digit CNIC — but a session with no
 * expiry needs somewhere it can be ended when the person holding the phone
 * no longer should be. Showing the list also means an unrecognised entry is
 * something a person can *notice*, which is the only way account sharing or
 * a borrowed password ever comes to light in a school.
 */
export function SignedInDevices({ devices }: { devices: DeviceSession[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const others = devices.filter((device) => !device.current);

  function signOutOthers() {
    startTransition(async () => {
      const result = await revokeOtherDevices();
      if (result.ok) {
        toast.success(result.message ?? "Done.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>Where you're signed in</CardTitle>
          <p className="mt-1 text-sm text-fg-subtle">
            Computers are signed out automatically after 24 hours. Phones stay signed in until you
            sign out here or on the device itself.
          </p>
        </div>
        {others.length > 0 && (
          <Button variant="secondary" size="sm" onClick={signOutOthers} loading={isPending}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out everywhere else
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <ul className="flex flex-col divide-y divide-line">
          {devices.map((device) => {
            const Icon = device.deviceClass === "MOBILE" ? Smartphone : Laptop;
            return (
              <li
                key={device.chainId}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-surface-sunken text-fg-subtle">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-fg">
                    <span className="truncate">{device.label}</span>
                    {device.current && <Badge variant="success">This device</Badge>}
                  </p>
                  <p className="truncate text-xs text-fg-subtle">
                    {device.current ? "Active now" : `Last active ${formatRelativeTime(device.lastSeenAt)}`}
                    {device.ip ? ` · ${device.ip}` : ""}
                  </p>
                  <p className="truncate text-xs text-fg-subtle">
                    {device.expiresAt
                      ? `Signs out ${formatDateTime(device.expiresAt)}`
                      : "Stays signed in until you sign out"}
                  </p>
                </div>

                <ConfirmAction
                  trigger={{ label: device.current ? "Sign out" : "Remove", size: "xs" }}
                  title={device.current ? "Sign out of this device?" : `Sign out ${device.label}?`}
                  confirmLabel="Sign out"
                  body={
                    device.current
                      ? "You'll need your CNIC and password to sign back in on this device."
                      : `Anyone using ${device.label} will be signed out immediately and will need your password to get back in.`
                  }
                  action={() => revokeDevice({ chainId: device.chainId })}
                />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
