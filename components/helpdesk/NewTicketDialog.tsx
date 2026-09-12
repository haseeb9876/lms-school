"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTicket } from "@/lib/actions/helpdesk";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { TextareaField } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";

const CATEGORIES = [
  { value: "Portal access", label: "Portal access" },
  { value: "Fees", label: "Fees" },
  { value: "Examinations", label: "Examinations" },
  { value: "Attendance", label: "Attendance" },
  { value: "Transport", label: "Transport" },
  { value: "Other", label: "Other" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export function NewTicketButton() {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleSubmit(formData: FormData) {
    setFieldErrors({});

    startTransition(async () => {
      const result = await createTicket({
        subject: String(formData.get("subject") ?? ""),
        category: String(formData.get("category") ?? "") || undefined,
        priority: String(formData.get("priority") ?? "MEDIUM") as "MEDIUM",
        message: String(formData.get("message") ?? ""),
      });

      if (result.ok) {
        toast.success(result.message ?? "Message sent.");
        setOpen(false);
        router.push(`/helpdesk/${result.data.id}`);
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        New message
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Message the principal"
        description="Private — only you and the principal can read this."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" form="new-ticket" loading={isPending}>
              Send message
            </Button>
          </>
        }
      >
        <form id="new-ticket" action={handleSubmit} className="flex flex-col gap-4">
          <InputField
            name="subject"
            label="Subject"
            required
            placeholder="e.g. Unable to see my child's attendance"
            error={fieldErrors.subject}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="category"
              label="Category"
              options={CATEGORIES}
              placeholder="Choose a category"
              error={fieldErrors.category}
            />
            <SelectField
              name="priority"
              label="Priority"
              defaultValue="MEDIUM"
              options={PRIORITIES}
              error={fieldErrors.priority}
            />
          </div>

          <TextareaField
            name="message"
            label="Details"
            required
            rows={5}
            placeholder="Describe what's happening…"
            error={fieldErrors.message}
          />
        </form>
      </Dialog>
    </>
  );
}
