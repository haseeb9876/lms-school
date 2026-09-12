"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { gradeSubmission } from "@/lib/actions/assignments";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface GradingRow {
  studentId: string;
  name: string;
  rollNumber: string | null;
  admissionNumber: string;
  submission: {
    status: "SUBMITTED" | "LATE" | "GRADED" | "MISSING";
    submittedAt: Date | null;
    marksObtained: number | null;
    feedback: string | null;
  } | null;
}

/**
 * Grades are saved per row rather than as one big form submit.
 *
 * A teacher marking thirty scripts works through them one at a time and
 * gets interrupted constantly. Saving each row as it's finished means a
 * closed tab or a dropped connection costs one student's marks, not the
 * whole class's — and it gives immediate confirmation that each entry
 * actually landed.
 */
export function GradingTable({
  assignmentId,
  maxMarks,
  rows,
}: {
  assignmentId: string;
  maxMarks: number;
  rows: GradingRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [drafts, setDrafts] = useState<Record<string, { marks: string; feedback: string }>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.studentId,
        {
          marks: row.submission?.marksObtained?.toString() ?? "",
          feedback: row.submission?.feedback ?? "",
        },
      ])
    )
  );

  function save(studentId: string) {
    const draft = drafts[studentId];
    const trimmed = draft.marks.trim();
    // An empty box means "not graded yet", which is a different thing from
    // a zero and has to round-trip as null.
    const marks = trimmed === "" ? null : Number(trimmed);

    if (marks !== null && (!Number.isFinite(marks) || marks < 0 || marks > maxMarks)) {
      toast.error(`Marks must be between 0 and ${maxMarks}.`);
      return;
    }

    setSavingId(studentId);
    startTransition(async () => {
      const result = await gradeSubmission({
        assignmentId,
        studentId,
        marksObtained: marks,
        feedback: draft.feedback,
      });

      setSavingId(null);

      if (result.ok) {
        setSavedIds((current) => new Set(current).add(studentId));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const draft = drafts[row.studentId];
        const original = {
          marks: row.submission?.marksObtained?.toString() ?? "",
          feedback: row.submission?.feedback ?? "",
        };
        const dirty = draft.marks !== original.marks || draft.feedback !== original.feedback;
        const saving = savingId === row.studentId;
        const justSaved = savedIds.has(row.studentId) && !dirty;

        return (
          <li
            key={row.studentId}
            className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-3 shadow-soft lg:flex-row lg:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="w-7 flex-none text-center text-xs font-semibold tabular-nums text-fg-subtle">
                {row.rollNumber ?? "—"}
              </span>
              <Avatar name={row.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{row.name}</p>
                <p className="truncate text-xs text-fg-subtle">
                  {row.submission?.submittedAt
                    ? `Submitted ${formatDateTime(row.submission.submittedAt)}`
                    : "Not submitted"}
                </p>
              </div>
            </div>

            <div className="flex flex-none items-center gap-2">
              {row.submission?.status === "LATE" && <Badge variant="warning">Late</Badge>}
              {!row.submission?.submittedAt && row.submission?.status !== "GRADED" && (
                <Badge variant="danger">Missing</Badge>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:flex-none">
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Marks for {row.name}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={maxMarks}
                  value={draft.marks}
                  placeholder="—"
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [row.studentId]: { ...current[row.studentId], marks: event.target.value },
                    }))
                  }
                  className="h-9 w-20 rounded-md border border-line bg-surface px-2 text-center text-sm tabular-nums text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
                <span className="text-xs text-fg-subtle">/ {maxMarks}</span>
              </label>

              <label className="flex-1">
                <span className="sr-only">Feedback for {row.name}</span>
                <input
                  type="text"
                  value={draft.feedback}
                  placeholder="Feedback (optional)"
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [row.studentId]: { ...current[row.studentId], feedback: event.target.value },
                    }))
                  }
                  className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-56"
                />
              </label>

              <button
                type="button"
                onClick={() => save(row.studentId)}
                disabled={!dirty || isPending}
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                  dirty
                    ? "bg-brand text-brand-fg hover:brightness-110"
                    : justSaved
                      ? "bg-success-soft text-success"
                      : "border border-line text-fg-subtle",
                  (!dirty || isPending) && "pointer-events-none"
                )}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : justSaved ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Saved
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
