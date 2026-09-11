"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceStatus } from "@prisma/client";
import { Check, CheckCheck, Save } from "lucide-react";
import { markAttendance } from "@/lib/actions/attendance";
import type { RosterEntry } from "@/lib/queries/attendance";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

const STATUSES: { value: AttendanceStatus; label: string; short: string; className: string }[] = [
  { value: "PRESENT", label: "Present", short: "P", className: "bg-success text-white border-success" },
  { value: "ABSENT", label: "Absent", short: "A", className: "bg-danger text-white border-danger" },
  { value: "LATE", label: "Late", short: "L", className: "bg-warning text-white border-warning" },
  { value: "EXCUSED", label: "Excused", short: "E", className: "bg-info text-white border-info" },
];

export function MarkAttendanceForm({
  sectionId,
  sectionLabel,
  date,
  roster,
  alreadyMarked,
}: {
  sectionId: string;
  sectionLabel: string;
  date: string;
  roster: RosterEntry[];
  alreadyMarked: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  /*
   * Defaulting an unmarked register to PRESENT matches how a register is
   * actually taken: a teacher calls out the handful of absentees, not the
   * thirty students who turned up. A previously saved register keeps exactly
   * what was recorded so that reopening it never silently changes anything.
   */
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(roster.map((entry) => [entry.studentId, entry.existingStatus ?? "PRESENT"]))
  );

  const counts = useMemo(() => {
    const tally = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } as Record<AttendanceStatus, number>;
    for (const status of Object.values(statuses)) tally[status] += 1;
    return tally;
  }, [statuses]);

  function setAll(status: AttendanceStatus) {
    setStatuses(Object.fromEntries(roster.map((entry) => [entry.studentId, status])));
  }

  function submit() {
    startTransition(async () => {
      const result = await markAttendance({
        sectionId,
        date,
        entries: roster.map((entry) => ({
          studentId: entry.studentId,
          status: statuses[entry.studentId] ?? "PRESENT",
        })),
      });

      if (result.ok) {
        toast.success(result.message ?? "Register saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (roster.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface-raised p-10 text-center">
        <p className="text-sm font-medium text-fg">No students enrolled</p>
        <p className="mt-1 text-sm text-fg-subtle">
          There are no active students in {sectionLabel} for the current academic year.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-raised p-3 shadow-soft">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {STATUSES.map((status) => (
            <span key={status.value} className="inline-flex items-center gap-1.5 text-fg-muted">
              <span className={cn("h-2.5 w-2.5 rounded-full", status.className.split(" ")[0])} aria-hidden="true" />
              {status.label}
              <span className="font-semibold tabular-nums text-fg">{counts[status.value]}</span>
            </span>
          ))}
        </div>

        <Button variant="secondary" size="sm" onClick={() => setAll("PRESENT")} disabled={isPending}>
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          Mark all present
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {roster.map((entry) => {
          const current = statuses[entry.studentId];
          return (
            <li
              key={entry.studentId}
              className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-3 shadow-soft sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="w-7 flex-none text-center text-xs font-semibold tabular-nums text-fg-subtle">
                  {entry.rollNumber ?? "—"}
                </span>
                <Avatar name={entry.name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{entry.name}</p>
                  <p className="truncate text-xs text-fg-subtle">{entry.admissionNumber}</p>
                </div>
              </div>

              <fieldset className="flex flex-none gap-1">
                <legend className="sr-only">Attendance for {entry.name}</legend>
                {STATUSES.map((status) => {
                  const active = current === status.value;
                  return (
                    <button
                      key={status.value}
                      type="button"
                      // radio semantics: one choice per student, and screen
                      // readers announce the group as a single control.
                      role="radio"
                      aria-checked={active}
                      aria-label={`${status.label} — ${entry.name}`}
                      onClick={() =>
                        setStatuses((current) => ({ ...current, [entry.studentId]: status.value }))
                      }
                      disabled={isPending}
                      className={cn(
                        "h-9 w-9 rounded-md border text-sm font-semibold transition-all sm:w-11",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                        active
                          ? status.className
                          : "border-line bg-surface text-fg-subtle hover:bg-surface-hover hover:text-fg"
                      )}
                    >
                      <span aria-hidden="true">{status.short}</span>
                    </button>
                  );
                })}
              </fieldset>
            </li>
          );
        })}
      </ul>

      {/* Sticky so the save button stays reachable on a class of thirty
          without scrolling back to the top. */}
      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-raised/95 p-3 shadow-raised backdrop-blur-sm md:bottom-4">
        <p className="text-sm text-fg-muted">
          {alreadyMarked ? "Register already taken — saving will update it." : `${roster.length} students`}
        </p>
        <Button onClick={submit} loading={isPending}>
          {isPending ? "Saving…" : alreadyMarked ? <>Update register</> : <>Save register</>}
          {!isPending && (alreadyMarked ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />)}
        </Button>
      </div>
    </div>
  );
}
