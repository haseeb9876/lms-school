"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { enterExamResults } from "@/lib/actions/exams";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { gradeForPercentage, gradeTone } from "@/lib/grading";
import { formatPercent } from "@/lib/format";

export interface MarkEntryRow {
  studentId: string;
  name: string;
  rollNumber: string | null;
  admissionNumber: string;
  marksObtained: number | null;
}

/**
 * Mark entry for a whole subject, saved as one submission.
 *
 * Unlike assignment grading (which is done a script at a time), exam marks
 * are transcribed from a mark sheet in one sitting, so the natural unit is
 * the whole class. The live grade beside each box is what catches a
 * transcription slip — a mark typed into the wrong row usually shows up as
 * an implausible grade long before anyone re-reads the numbers.
 */
export function MarkEntryTable({
  examId,
  totalMarks,
  rows,
}: {
  examId: string;
  totalMarks: number;
  rows: MarkEntryRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.studentId, row.marksObtained?.toString() ?? ""]))
  );

  const summary = useMemo(() => {
    const entered = Object.values(marks)
      .map((value) => (value.trim() === "" ? null : Number(value)))
      .filter((value): value is number => value !== null && Number.isFinite(value));

    if (entered.length === 0) return { count: 0, average: null as number | null, passed: 0 };

    const average = entered.reduce((sum, value) => sum + value, 0) / entered.length;
    const passed = entered.filter((value) => (value / totalMarks) * 100 >= 40).length;
    return { count: entered.length, average: (average / totalMarks) * 100, passed };
  }, [marks, totalMarks]);

  const invalid = Object.entries(marks).filter(([, value]) => {
    if (value.trim() === "") return false;
    const parsed = Number(value);
    return !Number.isFinite(parsed) || parsed < 0 || parsed > totalMarks;
  });

  function save() {
    if (invalid.length > 0) {
      toast.error(`Some marks are outside 0–${totalMarks}.`);
      return;
    }

    startTransition(async () => {
      const result = await enterExamResults({
        examId,
        results: rows.map((row) => {
          const raw = marks[row.studentId]?.trim() ?? "";
          return {
            studentId: row.studentId,
            marksObtained: raw === "" ? null : Number(raw),
          };
        }),
      });

      if (result.ok) {
        toast.success(result.message ?? "Marks saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface-raised p-3 text-xs shadow-soft">
        <span className="text-fg-muted">
          Entered <span className="font-semibold tabular-nums text-fg">{summary.count}</span> / {rows.length}
        </span>
        <span className="text-fg-muted">
          Average{" "}
          <span className="font-semibold tabular-nums text-fg">
            {summary.average === null ? "—" : formatPercent(summary.average, 1)}
          </span>
        </span>
        <span className="text-fg-muted">
          Passing <span className="font-semibold tabular-nums text-fg">{summary.passed}</span>
        </span>
        <span className="ml-auto text-fg-subtle">Out of {totalMarks}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const raw = marks[row.studentId] ?? "";
          const parsed = raw.trim() === "" ? null : Number(raw);
          const valid = parsed !== null && Number.isFinite(parsed) && parsed >= 0 && parsed <= totalMarks;
          const percent = valid ? (parsed / totalMarks) * 100 : null;
          const outOfRange = raw.trim() !== "" && !valid;

          return (
            <li
              key={row.studentId}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface-raised p-3 shadow-soft"
            >
              <span className="w-7 flex-none text-center text-xs font-semibold tabular-nums text-fg-subtle">
                {row.rollNumber ?? "—"}
              </span>
              <Avatar name={row.name} size="sm" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{row.name}</p>
                <p className="truncate text-xs text-fg-subtle">{row.admissionNumber}</p>
              </div>

              {percent !== null && (
                <div className="hidden flex-none items-center gap-2 sm:flex">
                  <span className="text-xs tabular-nums text-fg-subtle">{formatPercent(percent, 0)}</span>
                  <Badge variant={gradeTone(gradeForPercentage(percent))}>
                    {gradeForPercentage(percent)}
                  </Badge>
                </div>
              )}

              <label className="flex flex-none items-center gap-1.5">
                <span className="sr-only">Marks for {row.name}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={totalMarks}
                  value={raw}
                  placeholder="—"
                  aria-invalid={outOfRange || undefined}
                  onChange={(event) =>
                    setMarks((current) => ({ ...current, [row.studentId]: event.target.value }))
                  }
                  className="h-9 w-20 rounded-md border border-line bg-surface px-2 text-center text-sm tabular-nums text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-[invalid=true]:border-danger"
                />
                <span className="text-xs text-fg-subtle">/ {totalMarks}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-raised/95 p-3 shadow-raised backdrop-blur-sm md:bottom-4">
        <p className="text-sm text-fg-muted">
          {invalid.length > 0
            ? `${invalid.length} mark${invalid.length === 1 ? "" : "s"} outside 0–${totalMarks}`
            : "Blank entries are recorded as not sat."}
        </p>
        <Button onClick={save} loading={isPending} disabled={invalid.length > 0}>
          {!isPending && <Save className="h-4 w-4" aria-hidden="true" />}
          Save marks
        </Button>
      </div>
    </div>
  );
}
