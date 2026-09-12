"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Users } from "lucide-react";
import type { AnnouncementAudience, Role } from "@prisma/client";
import { publishAnnouncement } from "@/lib/actions/announcements";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { TextareaField } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import type { AudienceOption } from "@/lib/queries/audiences";

export function NewAnnouncementButton({
  role,
  audiences,
  sections,
}: {
  role: Role;
  audiences: AudienceOption[];
  sections: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<AnnouncementAudience>(
    audiences[0]?.value ?? "ALL"
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const selected = audiences.find((option) => option.value === audience);
  const needsSection = selected?.needsSection ?? false;

  function handleSubmit(formData: FormData) {
    setFieldErrors({});

    startTransition(async () => {
      const result = await publishAnnouncement({
        title: String(formData.get("title") ?? ""),
        body: String(formData.get("body") ?? ""),
        audience,
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

  if (audiences.length === 0) return null;

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
        description="Everyone in the audience you choose is notified straight away."
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
            placeholder="Mid-term examinations begin 12 October"
            error={fieldErrors.title}
          />

          <SelectField
            label="Send to"
            required
            value={audience}
            onChange={(event) => setAudience(event.target.value as AnnouncementAudience)}
            options={audiences.map((option) => ({ value: option.value, label: option.label }))}
            error={fieldErrors.audience}
          />

          {/* Says who this actually reaches, because "Section" alone doesn't
              tell a principal whether parents will see it. */}
          {selected && (
            <p className="-mt-2 flex items-start gap-1.5 text-xs text-fg-subtle">
              <Users className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
              {selected.description}
            </p>
          )}

          {needsSection && (
            <SelectField
              name="sectionId"
              label="Class"
              required
              options={sections}
              placeholder="Choose a class"
              hint={
                role === "TEACHER" ? "Only the classes you teach are listed." : undefined
              }
              error={fieldErrors.sectionId}
            />
          )}

          <TextareaField
            name="body"
            label="Message"
            required
            rows={6}
            placeholder="Write the announcement…"
            hint="The first line or two is used as the notification preview."
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
