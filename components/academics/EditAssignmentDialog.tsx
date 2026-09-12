"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateTeacherAssignment } from "@/lib/actions/timetable";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import type { Option } from "./SetupDialogs";

/**
 * Moves an existing assignment — the "take the Grade 1 English teacher off
 * Grade 1 and put them on Grade 2" case.
 *
 * Editing rather than remove-and-re-add matters because the timetable hangs
 * off this row: deleting the assignment would orphan every period built on
 * it, and re-adding wouldn't bring them back. The periods move with the
 * assignment by default, and the server refuses the whole move if any of
 * them would clash at the destination.
 */
export function EditAssignmentDialog({
  assignmentId,
  current,
  teachers,
  subjects,
  sections,
  periodCount,
}: {
  assignmentId: string;
  current: { teacherId: string; subjectId: string; sectionId: string };
  teachers: Option[];
  subjects: Option[];
  sections: Option[];
  periodCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState(current.teacherId);
  const [subjectId, setSubjectId] = useState(current.subjectId);
  const [sectionId, setSectionId] = useState(current.sectionId);
  const [movePeriods, setMovePeriods] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function close() {
    setOpen(false);
    setTeacherId(current.teacherId);
    setSubjectId(current.subjectId);
    setSectionId(current.sectionId);
    setMovePeriods(true);
  }

  function save() {
    startTransition(async () => {
      const result = await updateTeacherAssignment({
        id: assignmentId,
        teacherId,
        subjectId,
        sectionId,
        movePeriods,
      });

      if (result.ok) {
        toast.success(result.message ?? "Assignment updated.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const changed =
    teacherId !== current.teacherId ||
    subjectId !== current.subjectId ||
    sectionId !== current.sectionId;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit this assignment"
        className="rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>

      <Dialog
        open={open}
        onClose={close}
        title="Edit assignment"
        description="Change who teaches this subject, or which class they teach it to."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={save} loading={isPending} disabled={!changed}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SelectField
            label="Teacher"
            required
            value={teacherId}
            onChange={(event) => setTeacherId(event.target.value)}
            options={teachers}
          />
          <SelectField
            label="Subject"
            required
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            options={subjects}
          />
          <SelectField
            label="Class"
            required
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            options={sections}
          />

          {periodCount > 0 && (
            <>
              <Checkbox
                label={`Move the ${periodCount} timetable period${periodCount === 1 ? "" : "s"} too`}
                hint="Keeps the same days and times, against the new class."
                checked={movePeriods}
                onChange={(event) => setMovePeriods(event.target.checked)}
              />

              {!movePeriods && (
                <Alert variant="warning">
                  Those {periodCount} period{periodCount === 1 ? " will" : "s will"} be removed from
                  the timetable instead — a period can&apos;t point at a teacher who is no longer
                  assigned to that class.
                </Alert>
              )}
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}
