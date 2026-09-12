"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { resetUserPassword } from "@/lib/actions/people";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { CredentialHandover, type Credential } from "./CredentialHandover";

/**
 * Issues a new temporary password and shows it once for handover.
 *
 * This is what the school office does when a parent phones to say they
 * can't get in — which, for the 99% of accounts with no email on file, is
 * the only way back in. Two steps deliberately: confirm first, because it
 * signs the person out of every device immediately.
 */
export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<Credential[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function close() {
    setOpen(false);
    setIssued(null);
    if (issued) router.refresh();
  }

  function reset() {
    startTransition(async () => {
      const result = await resetUserPassword({ userId });
      if (result.ok) {
        setIssued([
          {
            label: result.data.name,
            cnic: result.data.cnic,
            password: result.data.password,
          },
        ]);
        toast.success(result.message ?? "New password issued.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        Reset password
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title={issued ? "New password issued" : "Issue a new password?"}
        description={
          issued
            ? "Read these details out to them. They'll be asked to choose their own password when they sign in."
            : undefined
        }
        size="sm"
        footer={
          issued ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={close} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={reset} loading={isPending}>
                Issue new password
              </Button>
            </>
          )
        }
      >
        {issued ? (
          <CredentialHandover credentials={issued} />
        ) : (
          <p className="text-sm leading-relaxed text-fg-muted">
            <span className="font-medium text-fg">{name}</span> will be signed out of every device
            immediately, and their current password will stop working. You&apos;ll be shown a new
            temporary password once, to pass on to them.
          </p>
        )}
      </Dialog>
    </>
  );
}
