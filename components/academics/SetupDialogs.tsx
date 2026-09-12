"use client";

import { CalendarPlus, BookPlus, Layers, Plus, UserPlus } from "lucide-react";
import {
  assignTeacherToSubject,
  createAcademicYear,
  createClass,
  createSection,
  createSubject,
  createTerm,
} from "@/lib/actions/academics";
import { FormDialog } from "@/components/ui/FormDialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { TextareaField } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";

export interface Option {
  value: string;
  label: string;
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export function NewYearButton() {
  return (
    <FormDialog
      trigger={{ label: "New academic year", icon: CalendarPlus }}
      title="Create an academic year"
      description="Everything else — classes, enrolments, fees — hangs off the current year."
      submitLabel="Create year"
      formId="new-year"
      size="sm"
      action={(formData) =>
        createAcademicYear({
          name: text(formData, "name"),
          startDate: text(formData, "startDate"),
          endDate: text(formData, "endDate"),
          makeCurrent: formData.get("makeCurrent") === "on",
        })
      }
    >
      {(errors) => (
        <>
          <InputField
            name="name"
            label="Name"
            required
            placeholder="2026-2027"
            hint="Two four-digit years, separated by a dash."
            error={errors.name}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField name="startDate" label="Starts" type="date" required error={errors.startDate} />
            <InputField name="endDate" label="Ends" type="date" required error={errors.endDate} />
          </div>
          <Checkbox
            name="makeCurrent"
            label="Make this the current year"
            hint="Only one year is current at a time; this will replace the existing one."
            defaultChecked
          />
        </>
      )}
    </FormDialog>
  );
}

export function NewTermButton({ years }: { years: Option[] }) {
  return (
    <FormDialog
      trigger={{ label: "Add term", icon: Plus, variant: "secondary" }}
      title="Add a term"
      description="Exams and fee invoices are grouped by term."
      submitLabel="Add term"
      formId="new-term"
      size="sm"
      action={(formData) =>
        createTerm({
          academicYearId: text(formData, "academicYearId"),
          name: text(formData, "name"),
          startDate: text(formData, "startDate"),
          endDate: text(formData, "endDate"),
        })
      }
    >
      {(errors) => (
        <>
          <SelectField
            name="academicYearId"
            label="Academic year"
            required
            options={years}
            placeholder="Choose a year"
            error={errors.academicYearId}
          />
          <InputField
            name="name"
            label="Term name"
            required
            placeholder="First Term"
            error={errors.name}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField name="startDate" label="Starts" type="date" required error={errors.startDate} />
            <InputField name="endDate" label="Ends" type="date" required error={errors.endDate} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function NewClassButton({ nextSortOrder }: { nextSortOrder: number }) {
  return (
    <FormDialog
      trigger={{ label: "Add class", icon: Layers }}
      title="Add a class"
      description="A grade level, e.g. Grade 9. Sections sit inside it."
      submitLabel="Add class"
      formId="new-class"
      size="sm"
      action={(formData) =>
        createClass({
          name: text(formData, "name"),
          sortOrder: Number(formData.get("sortOrder") ?? 0),
        })
      }
    >
      {(errors) => (
        <>
          <InputField name="name" label="Class name" required placeholder="Grade 9" error={errors.name} />
          <InputField
            name="sortOrder"
            label="Order"
            type="number"
            min={0}
            required
            defaultValue={nextSortOrder}
            hint="Controls where this class appears in every list."
            error={errors.sortOrder}
          />
        </>
      )}
    </FormDialog>
  );
}

export function NewSectionButton({
  classes,
  teachers,
}: {
  classes: Option[];
  teachers: Option[];
}) {
  return (
    <FormDialog
      trigger={{ label: "Add section", icon: Plus, variant: "secondary" }}
      title="Add a section"
      description="The group students are actually enrolled into, e.g. Grade 9 — A."
      submitLabel="Add section"
      formId="new-section"
      size="sm"
      action={(formData) =>
        createSection({
          classId: text(formData, "classId"),
          name: text(formData, "name"),
          classTeacherId: text(formData, "classTeacherId"),
          capacity: formData.get("capacity") ? Number(formData.get("capacity")) : undefined,
        })
      }
    >
      {(errors) => (
        <>
          <SelectField
            name="classId"
            label="Class"
            required
            options={classes}
            placeholder="Choose a class"
            error={errors.classId}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField name="name" label="Section" required placeholder="A" error={errors.name} />
            <InputField
              name="capacity"
              label="Capacity"
              type="number"
              min={1}
              placeholder="30"
              error={errors.capacity}
            />
          </div>
          <SelectField
            name="classTeacherId"
            label="Class teacher"
            options={teachers}
            placeholder="Assign later"
            hint="The teacher responsible for this section's register."
            error={errors.classTeacherId}
          />
        </>
      )}
    </FormDialog>
  );
}

export function NewSubjectButton() {
  return (
    <FormDialog
      trigger={{ label: "Add subject", icon: BookPlus }}
      title="Add a subject"
      submitLabel="Add subject"
      formId="new-subject"
      size="sm"
      action={(formData) =>
        createSubject({
          name: text(formData, "name"),
          code: text(formData, "code"),
          description: text(formData, "description"),
        })
      }
    >
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField name="name" label="Subject" required placeholder="Mathematics" error={errors.name} />
            <InputField
              name="code"
              label="Code"
              required
              placeholder="MATH"
              hint="Stored uppercase."
              error={errors.code}
            />
          </div>
          <TextareaField name="description" label="Description" rows={3} error={errors.description} />
        </>
      )}
    </FormDialog>
  );
}

export function AssignTeacherButton({
  teachers,
  subjects,
  sections,
}: {
  teachers: Option[];
  subjects: Option[];
  sections: Option[];
}) {
  return (
    <FormDialog
      trigger={{ label: "Assign teacher", icon: UserPlus }}
      title="Assign a teacher"
      description="Who teaches which subject to which class. This is what decides the registers a teacher can mark and the marks they can enter."
      submitLabel="Assign"
      formId="assign-teacher"
      size="sm"
      action={(formData) =>
        assignTeacherToSubject({
          teacherId: text(formData, "teacherId"),
          subjectId: text(formData, "subjectId"),
          sectionId: text(formData, "sectionId"),
        })
      }
    >
      {(errors) => (
        <>
          <SelectField
            name="teacherId"
            label="Teacher"
            required
            options={teachers}
            placeholder="Choose a teacher"
            error={errors.teacherId}
          />
          <SelectField
            name="subjectId"
            label="Subject"
            required
            options={subjects}
            placeholder="Choose a subject"
            error={errors.subjectId}
          />
          <SelectField
            name="sectionId"
            label="Class"
            required
            options={sections}
            placeholder="Choose a class"
            error={errors.sectionId}
          />
        </>
      )}
    </FormDialog>
  );
}
