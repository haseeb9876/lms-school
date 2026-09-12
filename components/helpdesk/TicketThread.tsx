"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import type { TicketStatus } from "@prisma/client";
import { replyToTicket, updateTicketStatus } from "@/lib/actions/helpdesk";
import { Button } from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";

export function TicketReplyForm({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const toast = useToast();

  if (closed) {
    return (
      <p className="rounded-lg border border-line bg-surface-sunken p-4 text-sm text-fg-subtle">
        This ticket is closed. Open a new one if you still need help.
      </p>
    );
  }

  function handleSubmit(formData: FormData) {
    setError(undefined);

    startTransition(async () => {
      const result = await replyToTicket({
        ticketId,
        message: String(formData.get("message") ?? ""),
      });

      if (result.ok) {
        // Clearing the box only after the server accepted the reply means a
        // rejected message isn't lost and can be retried as-is.
        formRef.current?.reset();
        toast.success(result.message ?? "Reply sent.");
        router.refresh();
      } else {
        setError(result.fieldErrors?.message ?? result.error);
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
      <TextareaField
        name="message"
        label="Reply"
        rows={4}
        required
        placeholder="Write your reply…"
        error={error}
      />
      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>
          {!isPending && <Send className="h-4 w-4" aria-hidden="true" />}
          Send reply
        </Button>
      </div>
    </form>
  );
}

const TRANSITIONS: { status: TicketStatus; label: string; variant: "primary" | "secondary" }[] = [
  { status: "IN_PROGRESS", label: "Mark in progress", variant: "secondary" },
  { status: "RESOLVED", label: "Mark resolved", variant: "primary" },
  { status: "CLOSED", label: "Close ticket", variant: "secondary" },
];

export function TicketStatusControl({
  ticketId,
  current,
}: {
  ticketId: string;
  current: TicketStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function setStatus(status: TicketStatus) {
    startTransition(async () => {
      const result = await updateTicketStatus({ ticketId, status });
      if (result.ok) {
        toast.success(result.message ?? "Ticket updated.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {TRANSITIONS.filter((transition) => transition.status !== current).map((transition) => (
        <Button
          key={transition.status}
          size="sm"
          variant={transition.variant}
          disabled={isPending}
          onClick={() => setStatus(transition.status)}
        >
          {transition.label}
        </Button>
      ))}
    </div>
  );
}
