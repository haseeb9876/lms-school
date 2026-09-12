"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { createPeriod, deletePeriod, updatePeriod } from "@/lib/actions/timetable";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { DAYS_OF_WEEK } from "@/lib/schemas/timetable";
import { humanizeEnum } from "@/lib/format";

/**
 * A teaching assignment, which is what a period is actually scheduled
 * against — a teacher, a subject and a class, already paired up.
 */
export interface AssignmentOption {
  id: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  label: string;
}

export interface PeriodValues {
  id: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
}

const DAY_OPTIONS = DAYS_OF_WEEK.map((day) => ({ value: day, label: humanizeEnum(day) }));

/**
 * Adds or edits one timetable period.
 *
 * The form picks a *teaching assignment* rather than three separate
 * dropdowns for teacher, subject and class. Those three are not independent
 * — only certain combinations exist — and choosing them freely produces
 * periods the server has to reject, or worse, a timetable that grants a
 * teacher a class the staffing table never gave them.
 */
export function PeriodDialog({
  assignments,
  period,
  defaultSectionId,
  trigger,
}: {
  assignments: AssignmentOption[];
  /** Present when editing; absent when adding. */
  period?: PeriodValues;
  defaultSectionId?: string;
  trigger?: { label: string; variant?: "primary" | "secondary" | "ghost" };
}) {
  const editing = Boolean(period);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const toast = useToast();

  const matching = period
    ? assignments.find(
        (a) =>
          a.sectionId === period.sectionId &&
          a.subjectId === period.subjectId &&
          a.teacherId === period.teacherId
      )
    : undefined;

  const [assignmentId, setAssignmentId] = useState(matching?.id ?? assignments[0]?.id ?? "");

  function close() {
    setOpen(false);
    setFieldErrors({});
  }

  function handleSubmit(formData: FormData) {
    setFieldErrors({});
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      toast.error("Choose a class and subject.");
      return;
    }

    const payload = {
      sectionId: assignment.sectionId,
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId,
      dayOfWeek: String(formData.get("dayOfWeek") ?? "MONDAY") as "MONDAY",
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
      room: String(formData.get("room") ?? ""),
    };

    startTransition(async () => {
      const result = period
        ? await updatePeriod({ id: period.id, ...payload })
        : await createPeriod(payload);

      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        close();
        router.refresh();
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        // A clash is explained in full ("Ayesha Khan already teaches…"), so
        // it belongs in a toast rather than squeezed under a field.
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  function remove() {
    if (!period) return;
    startTransition(async () => {
      const result = await deletePeriod({ id: period.id });
      if (result.ok) {
        toast.success(result.message ?? "Removed.");
        close();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const relevant = defaultSectionId
    ? assignments.filter((a) => a.sectionId === defaultSectionId)
    : assignments;
  const options = relevant.length > 0 ? relevant : assignments;

  if (options.length === 0 && !editing) return null;

  return (
    <>
      {editing ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Edit this period"
          className="rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : (
        <Button size="sm" variant={trigger?.variant ?? "primary"} onClick={() => setOpen(true)}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          {trigger?.label ?? "Add period"}
        </Button>
      )}

      <Dialog
        open={open}
        onClose={close}
        title={editing ? "Edit period" : "Add a period"}
        description="Clashes with an existing period — for the teacher, the class or the room — are refused."
        size="md"
        footer={
          <>
            {editing && (
              <Button variant="ghost" onClick={remove} disabled={isPending} className="mr-auto text-danger">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            )}
            <Button variant="secondary" onClick={close} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" form="period-form" loading={isPending}>
              {editing ? "Save period" : "Add period"}
            </Button>
          </>
        }
      >
        <form id="period-form" action={handleSubmit} className="flex flex-col gap-4">
          <SelectField
            label="Class, subject and teacher"
            required
            value={assignmentId}
            onChange={(event) => setAssignmentId(event.target.value)}
            options={options.map((a) => ({ value: a.id, label: a.label }))}
            hint="Only combinations set up under Staffing can be timetabled."
          />

          <SelectField
            name="dayOfWeek"
            label="Day"
            required
            defaultValue={period?.dayOfWeek ?? "MONDAY"}
            options={DAY_OPTIONS}
            error={fieldErrors.dayOfWeek}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              name="startTime"
              label="Starts"
              type="time"
              required
              defaultValue={period?.startTime ?? "08:00"}
              error={fieldErrors.startTime}
            />
            <InputField
              name="endTime"
              label="Ends"
              type="time"
              required
              defaultValue={period?.endTime ?? "08:45"}
              error={fieldErrors.endTime}
            />
          </div>

          <InputField
            name="room"
            label="Room"
            placeholder="Room 101"
            defaultValue={period?.room ?? ""}
            error={fieldErrors.room}
          />
        </form>
      </Dialog>
    </>
  );
}
