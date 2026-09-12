"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createDatesheet } from "@/lib/actions/datesheets";
import { PRINCIPAL_AUDIENCES } from "@/lib/queries/audiences";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { TextareaField } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";

interface Option {
  id: string;
  label?: string;
  name?: string;
}

/**
 * Creating a datesheet asks only what it cannot work out: what to call it,
 * who it is for, and when the examinations start.
 *
 * The content — photographs, typed papers, or both — is added on the
 * datesheet's own page afterwards. Putting a file picker and a repeating row
 * editor inside this dialog would make the first step of publishing a
 * datesheet a form a principal has to finish in one sitting, which is not
 * how an exam timetable gets assembled.
 */
export function NewDatesheetButton({ sections, terms }: { sections: Option[]; terms: Option[] }) {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState("ALL");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const needsSection = PRINCIPAL_AUDIENCES.find((option) => option.value === audience)?.needsSection;

  function handleSubmit(formData: FormData) {
    setFieldErrors({});

    startTransition(async () => {
      const result = await createDatesheet({
        title: String(formData.get("title") ?? ""),
        termId: String(formData.get("termId") ?? ""),
        audience: audience as "ALL",
        sectionId: String(formData.get("sectionId") ?? ""),
        startsOn: String(formData.get("startsOn") ?? ""),
        notes: String(formData.get("notes") ?? ""),
        entries: [],
      });

      if (result.ok) {
        toast.success(result.message ?? "Draft created.");
        setOpen(false);
        // Straight to the datesheet, which is where the photographs and the
        // papers are added — the draft on its own does nothing yet.
        router.push(`/datesheets/${result.data.id}`);
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
        New datesheet
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New datesheet"
        description="Saved as a draft. Nobody is notified until you publish it."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" form="new-datesheet" loading={isPending}>
              Create draft
            </Button>
          </>
        }
      >
        <form id="new-datesheet" action={handleSubmit} className="flex flex-col gap-4">
          <InputField
            name="title"
            label="Title"
            required
            placeholder="e.g. Mid Term Examinations 2026"
            error={fieldErrors.title}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="termId"
              label="Term"
              placeholder="Not tied to a term"
              options={terms.map((term) => ({ value: term.id, label: term.name ?? "" }))}
              error={fieldErrors.termId}
            />
            <InputField
              name="startsOn"
              type="date"
              label="Examinations begin"
              hint="Optional — worked out from the papers if you type them."
              error={fieldErrors.startsOn}
            />
          </div>

          <SelectField
            name="audience"
            label="Who is this for?"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            options={PRINCIPAL_AUDIENCES.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            hint={PRINCIPAL_AUDIENCES.find((option) => option.value === audience)?.description}
            error={fieldErrors.audience}
          />

          {needsSection && (
            <SelectField
              name="sectionId"
              label="Class"
              required
              placeholder="Choose a class"
              options={sections.map((section) => ({
                value: section.id,
                label: section.label ?? section.name ?? "",
              }))}
              error={fieldErrors.sectionId}
            />
          )}

          <TextareaField
            name="notes"
            label="Notes"
            rows={3}
            placeholder="Anything students should know — what to bring, reporting time, uniform."
            error={fieldErrors.notes}
          />
        </form>
      </Dialog>
    </>
  );
}
