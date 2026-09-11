"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createAssignment } from "@/lib/actions/assignments";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { TextareaField } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { todaySchoolDate } from "@/lib/format";

interface Option {
  value: string;
  label: string;
}

export function NewAssignmentButton({
  sections,
  subjects,
}: {
  sections: Option[];
  subjects: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleSubmit(formData: FormData) {
    setFieldErrors({});

    startTransition(async () => {
      const result = await createAssignment({
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        sectionId: String(formData.get("sectionId") ?? ""),
        subjectId: String(formData.get("subjectId") ?? ""),
        dueDate: String(formData.get("dueDate") ?? ""),
        maxMarks: Number(formData.get("maxMarks") ?? 0),
      });

      if (result.ok) {
        toast.success(result.message ?? "Assignment posted.");
        setOpen(false);
        router.refresh();
      } else {
        // Field-level errors land under the inputs; anything else is a
        // single message the form can't attribute to one control.
        setFieldErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  const disabled = sections.length === 0 || subjects.length === 0;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        New assignment
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Post an assignment"
        description="Set work for one of your classes."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" form="new-assignment" loading={isPending}>
              Post assignment
            </Button>
          </>
        }
      >
        <form id="new-assignment" action={handleSubmit} className="flex flex-col gap-4">
          <InputField
            name="title"
            label="Title"
            required
            placeholder="e.g. Quadratic Equations Worksheet"
            error={fieldErrors.title}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="sectionId"
              label="Class"
              required
              options={sections}
              placeholder="Choose a class"
              error={fieldErrors.sectionId}
            />
            <SelectField
              name="subjectId"
              label="Subject"
              required
              options={subjects}
              placeholder="Choose a subject"
              error={fieldErrors.subjectId}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              name="dueDate"
              label="Due date"
              type="date"
              required
              defaultValue={todaySchoolDate()}
              error={fieldErrors.dueDate}
            />
            <InputField
              name="maxMarks"
              label="Total marks"
              type="number"
              min={1}
              max={1000}
              required
              defaultValue={20}
              error={fieldErrors.maxMarks}
            />
          </div>

          <TextareaField
            name="description"
            label="Instructions"
            hint="Optional — what students need to do."
            error={fieldErrors.description}
          />
        </form>
      </Dialog>
    </>
  );
}
