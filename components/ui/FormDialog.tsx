"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Button, type ButtonVariant } from "./Button";
import { Dialog } from "./Dialog";
import { useToast } from "./Toast";
import type { ActionResult } from "@/lib/actions/types";

/**
 * A dialog wrapping one form that calls one Server Action.
 *
 * Every create form in the setup screens needs the same five things: pending
 * state, field errors rendered under the right inputs, a toast on success,
 * a router refresh, and a reset on close. Writing that out per form is where
 * the inconsistencies creep in — one dialog forgetting to clear its errors,
 * another not refreshing. The form body stays bespoke; only the plumbing is
 * shared.
 */
export function FormDialog<TResult>({
  trigger,
  title,
  description,
  submitLabel,
  size = "md",
  formId,
  action,
  children,
  onSuccess,
}: {
  trigger: { label: string; icon?: LucideIcon; variant?: ButtonVariant; size?: "xs" | "sm" | "md" };
  title: string;
  description?: string;
  submitLabel: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Must be unique on the page — links the footer's submit to this form. */
  formId: string;
  action: (formData: FormData) => Promise<ActionResult<TResult>>;
  /** Receives field errors so inputs can render their own messages. */
  children: (fieldErrors: Record<string, string>) => ReactNode;
  onSuccess?: (data: TResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const TriggerIcon = trigger.icon;

  function close() {
    setOpen(false);
    setFieldErrors({});
  }

  function handleSubmit(formData: FormData) {
    setFieldErrors({});

    startTransition(async () => {
      const result = await action(formData);

      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        close();
        router.refresh();
        onSuccess?.(result.data);
      } else {
        // Field errors go under their inputs; anything the server couldn't
        // attribute to one field becomes a toast instead of vanishing.
        setFieldErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button
        size={trigger.size ?? "sm"}
        variant={trigger.variant}
        onClick={() => setOpen(true)}
      >
        {TriggerIcon && <TriggerIcon className="h-4 w-4" aria-hidden="true" />}
        {trigger.label}
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title={title}
        description={description}
        size={size}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" form={formId} loading={isPending}>
              {submitLabel}
            </Button>
          </>
        }
      >
        <form id={formId} action={handleSubmit} className="flex flex-col gap-4">
          {children(fieldErrors)}
        </form>
      </Dialog>
    </>
  );
}
