"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import type { Role } from "@prisma/client";
import { publishAnnouncement } from "@/lib/actions/announcements";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { TextareaField } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";

const PRINCIPAL_AUDIENCES = [
  { value: "ALL", label: "Everyone" },
  { value: "TEACHERS", label: "Teachers" },
  { value: "STUDENTS", label: "Students" },
  { value: "PARENTS", label: "Guardians" },
  { value: "SECTION", label: "A specific class" },
];

// Teachers only ever address a class they teach; the server enforces this
// too, but offering the wider options would just produce refusals.
const TEACHER_AUDIENCES = [{ value: "SECTION", label: "A specific class" }];

export function NewAnnouncementButton({
  role,
  sections,
}: {
  role: Role;
  sections: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState(role === "TEACHER" ? "SECTION" : "ALL");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const audiences = role === "TEACHER" ? TEACHER_AUDIENCES : PRINCIPAL_AUDIENCES;

  function handleSubmit(formData: FormData) {
    setFieldErrors({});

    startTransition(async () => {
      const result = await publishAnnouncement({
        title: String(formData.get("title") ?? ""),
        body: String(formData.get("body") ?? ""),
        audience: String(formData.get("audience") ?? "ALL") as "ALL",
        sectionId: String(formData.get("sectionId") ?? "") || undefined,
        expiresAt: String(formData.get("expiresAt") ?? "") || undefined,
      });

      if (result.ok) {
        toast.success(result.message ?? "Announcement published.");
        setOpen(false);
        router.refresh();
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Megaphone className="h-4 w-4" aria-hidden="true" />
        New announcement
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Publish an announcement"
        description="Everyone in the audience you choose gets a notification."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" form="new-announcement" loading={isPending}>
              Publish
            </Button>
          </>
        }
      >
        <form id="new-announcement" action={handleSubmit} className="flex flex-col gap-4">
          <InputField
            name="title"
            label="Title"
            required
            placeholder="e.g. Parent–teacher meeting on Saturday"
            error={fieldErrors.title}
          />

          <SelectField
            name="audience"
            label="Audience"
            required
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            options={audiences}
            error={fieldErrors.audience}
          />

          {audience === "SECTION" && (
            <SelectField
              name="sectionId"
              label="Class"
              required
              options={sections}
              placeholder="Choose a class"
              error={fieldErrors.sectionId}
            />
          )}

          <TextareaField
            name="body"
            label="Message"
            required
            rows={6}
            placeholder="Write the announcement…"
            error={fieldErrors.body}
          />

          <InputField
            name="expiresAt"
            label="Hide after"
            type="date"
            hint="Optional — the notice disappears on its own after this date."
            error={fieldErrors.expiresAt}
          />
        </form>
      </Dialog>
    </>
  );
}
