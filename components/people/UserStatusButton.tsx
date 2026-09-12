"use client";

import { ShieldOff, ShieldCheck } from "lucide-react";
import { setUserStatus } from "@/lib/actions/people";
import { ConfirmAction } from "@/components/ui/ConfirmAction";

/**
 * Suspends or reactivates an account.
 *
 * Suspension is the immediate lever when a login is compromised or a member
 * of staff leaves: it revokes their live sessions, not just their next
 * sign-in. The record itself is untouched — attendance, marks and fees all
 * remain, which is why this is a status change rather than a deletion.
 */
export function UserStatusButton({
  userId,
  name,
  status,
}: {
  userId: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
}) {
  if (status === "SUSPENDED") {
    return (
      <ConfirmAction
        trigger={{ label: "Reactivate", icon: ShieldCheck, variant: "secondary" }}
        title="Reactivate this account?"
        confirmLabel="Reactivate"
        variant="primary"
        body={
          <>
            <span className="font-medium text-fg">{name}</span> will be able to sign in again with
            their existing password.
          </>
        }
        action={() => setUserStatus({ userId, status: "ACTIVE" })}
      />
    );
  }

  return (
    <ConfirmAction
      trigger={{ label: "Suspend", icon: ShieldOff, variant: "secondary" }}
      title="Suspend this account?"
      confirmLabel="Suspend account"
      body={
        <>
          <span className="font-medium text-fg">{name}</span> will be signed out immediately and
          won&apos;t be able to sign in again until reactivated. Their records are kept.
        </>
      }
      action={() => setUserStatus({ userId, status: "SUSPENDED" })}
    />
  );
}
