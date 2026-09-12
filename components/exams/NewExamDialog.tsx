"use client";

import { CalendarPlus } from "lucide-react";
import { createExam } from "@/lib/actions/exam-setup";
import { FormDialog } from "@/components/ui/FormDialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import type { Option } from "@/components/academics/SetupDialogs";

export function NewExamButton({
  terms,
  subjects,
  sections,
}: {
  terms: Option[];
  subjects: Option[];
  sections: Option[];
}) {
  const disabled = terms.length === 0 || subjects.length === 0 || sections.length === 0;
  if (disabled) return null;

  return (
    <FormDialog
      trigger={{ label: "Schedule exam", icon: CalendarPlus }}
      title="Schedule an examination"
      description="One subject, one class. Marks are entered against it once it's been sat."
      submitLabel="Schedule"
      formId="new-exam"
      size="md"
      action={(formData) =>
        createExam({
          name: String(formData.get("name") ?? ""),
          termId: String(formData.get("termId") ?? ""),
          subjectId: String(formData.get("subjectId") ?? ""),
          sectionId: String(formData.get("sectionId") ?? ""),
          examDate: String(formData.get("examDate") ?? ""),
          totalMarks: Number(formData.get("totalMarks") ?? 100),
        })
      }
    >
      {(errors) => (
        <>
          <InputField
            name="name"
            label="Examination name"
            required
            placeholder="Mid Term Examination"
            error={errors.name}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              name="sectionId"
              label="Class"
              required
              options={sections}
              placeholder="Choose a class"
              error={errors.sectionId}
            />
            <SelectField
              name="subjectId"
              label="Subject"
              required
              options={subjects}
              placeholder="Choose a subject"
              error={errors.subjectId}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              name="termId"
              label="Term"
              required
              options={terms}
              placeholder="Choose a term"
              error={errors.termId}
            />
            <InputField name="examDate" label="Date" type="date" required error={errors.examDate} />
            <InputField
              name="totalMarks"
              label="Total marks"
              type="number"
              min={1}
              required
              defaultValue={100}
              error={errors.totalMarks}
            />
          </div>
        </>
      )}
    </FormDialog>
  );
}
