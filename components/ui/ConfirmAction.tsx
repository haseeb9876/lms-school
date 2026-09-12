"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Button, type ButtonVariant } from "./Button";
import { Dialog } from "./Dialog";
import { TextareaField } from "./Textarea";
import { useToast } from "./Toast";
import type { ActionResult } from "@/lib/actions/types";

/**
 * A destructive or irreversible action behind a confirmation.
 *
 * The confirmation names the specific thing being acted on rather than
 * asking "are you sure?" — what is worth checking is whether this is the
 * right record, which a generic prompt cannot tell you. Actions that need a
 * recorded justification (cancelling an invoice, suspending an account) can
 * require one before the button enables.
 */
export function ConfirmAction<TResult>({
  trigger,
  title,
  body,
  confirmLabel,
  variant = "danger",
  reason,
  action,
}: {
  trigger: { label: string; icon?: LucideIcon; variant?: ButtonVariant; size?: "xs" | "sm" | "md" };
  title: string;
  body: ReactNode;
  confirmLabel: string;
  variant?: ButtonVariant;
  /** Requires a typed reason, passed to the action. */
  reason?: { label: string; placeholder?: string; minLength?: number };
  action: (reason: string) => Promise<ActionResult<TResult>>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const TriggerIcon = trigger.icon;

  const minLength = reason?.minLength ?? 3;
  const ready = !reason || text.trim().length >= minLength;

  function confirm() {
    startTransition(async () => {
      const result = await action(text.trim());
      if (result.ok) {
        toast.success(result.message ?? "Done.");
        setOpen(false);
        setText("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button
        size={trigger.size ?? "sm"}
        variant={trigger.variant ?? "secondary"}
        onClick={() => setOpen(true)}
      >
        {TriggerIcon && <TriggerIcon className="h-4 w-4" aria-hidden="true" />}
        {trigger.label}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant={variant} onClick={confirm} loading={isPending} disabled={!ready}>
              {confirmLabel}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="text-sm leading-relaxed text-fg-muted">{body}</div>

          {reason && (
            <TextareaField
              label={reason.label}
              rows={3}
              required
              value={text}
              placeholder={reason.placeholder}
              onChange={(event) => setText(event.target.value)}
              hint="Recorded in the audit log."
            />
          )}
        </div>
      </Dialog>
    </>
  );
}
