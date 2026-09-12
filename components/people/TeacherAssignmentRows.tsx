"use client";

import { Plus, Trash2 } from "lucide-react";
import { SelectField, type SelectOption } from "@/components/ui/Select";
import { InputField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DAYS_OF_WEEK } from "@/lib/schemas/timetable";
import { humanizeEnum } from "@/lib/format";

export interface AssignmentRow {
  subjectId: string;
  sectionId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
}

export const EMPTY_ROW: AssignmentRow = {
  subjectId: "",
  sectionId: "",
  dayOfWeek: "",
  startTime: "",
  endTime: "",
  room: "",
};

const DAY_OPTIONS: SelectOption[] = DAYS_OF_WEEK.map((day) => ({
  value: day,
  label: humanizeEnum(day),
}));

/**
 * The classes a teacher is given, edited as a list of rows.
 *
 * Subject and class are what grant access, so they're required. The day and
 * time are optional per row: a school usually knows who teaches what before
 * the timetable is settled, and demanding a time would mean inventing one.
 * A row with a partial time is rejected rather than half-saved — the server
 * enforces the same rule.
 */
export function TeacherAssignmentRows({
  rows,
  onChange,
  subjects,
  sections,
}: {
  rows: AssignmentRow[];
  onChange: (rows: AssignmentRow[]) => void;
  subjects: SelectOption[];
  sections: SelectOption[];
}) {
  function update(index: number, patch: Partial<AssignmentRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const disabled = subjects.length === 0 || sections.length === 0;

  if (disabled) {
    return (
      <p className="rounded-md border border-line bg-surface-sunken p-3 text-sm text-fg-subtle">
        Add subjects and classes under Academic setup first, then they can be assigned here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <div key={index} className="rounded-md border border-line bg-surface-sunken p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              Class {index + 1}
            </p>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                aria-label={`Remove class ${index + 1}`}
                className="-m-1 rounded p-1 text-fg-subtle transition-colors hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Class"
              value={row.sectionId}
              onChange={(event) => update(index, { sectionId: event.target.value })}
              options={sections}
              placeholder="Choose a class"
            />
            <SelectField
              label="Subject"
              value={row.subjectId}
              onChange={(event) => update(index, { subjectId: event.target.value })}
              options={subjects}
              placeholder="Choose a subject"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <SelectField
              label="Day"
              value={row.dayOfWeek}
              onChange={(event) => update(index, { dayOfWeek: event.target.value })}
              options={DAY_OPTIONS}
              placeholder="Later"
            />
            <InputField
              label="Starts"
              type="time"
              value={row.startTime}
              onChange={(event) => update(index, { startTime: event.target.value })}
            />
            <InputField
              label="Ends"
              type="time"
              value={row.endTime}
              onChange={(event) => update(index, { endTime: event.target.value })}
            />
            <InputField
              label="Room"
              placeholder="101"
              value={row.room}
              onChange={(event) => update(index, { room: event.target.value })}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...rows, { ...EMPTY_ROW }])}
        className="self-start"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add another class
      </Button>

      <p className="text-xs text-fg-subtle">
        Leave the day and times blank to assign the class now and timetable it later. More periods
        for the same class can be added from the class&apos;s timetable.
      </p>
    </div>
  );
}
