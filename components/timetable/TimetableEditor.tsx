import { CalendarDays } from "lucide-react";
import type { DayOfWeek } from "@prisma/client";
import { formatTimeOfDay, humanizeEnum } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { PeriodDialog, type AssignmentOption, type PeriodValues } from "./PeriodDialog";
import { cn } from "@/lib/cn";

const DAY_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export interface EditablePeriod extends PeriodValues {
  subjectName: string;
  teacherName: string;
}

/**
 * The principal's editable view of one class's week.
 *
 * Laid out as a day-by-day list rather than the read-only grid: editing is
 * a per-row action, and a grid at phone width leaves no room for controls.
 * Days with nothing scheduled are still shown, because "Thursday is empty"
 * is exactly what someone building a timetable needs to see.
 */
export function TimetableEditor({
  periods,
  assignments,
  sectionId,
}: {
  periods: EditablePeriod[];
  assignments: AssignmentOption[];
  sectionId: string;
}) {
  const byDay = new Map<DayOfWeek, EditablePeriod[]>();
  for (const period of periods) {
    const list = byDay.get(period.dayOfWeek as DayOfWeek) ?? [];
    list.push(period);
    byDay.set(period.dayOfWeek as DayOfWeek, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // Sunday only appears once something is actually scheduled on it.
  const days = DAY_ORDER.filter(
    (day) => day !== "SUNDAY" || (byDay.get(day)?.length ?? 0) > 0
  );

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No subjects assigned to this class yet"
        description="Assign teachers to subjects for this class under Academic setup → Staffing, then their periods can be timetabled here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-subtle">
          {periods.length} period{periods.length === 1 ? "" : "s"} scheduled this week.
        </p>
        <PeriodDialog assignments={assignments} defaultSectionId={sectionId} />
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const list = byDay.get(day) ?? [];
          return (
            <section key={day} className="rounded-lg border border-line bg-surface-raised shadow-soft">
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                <h3 className="text-sm font-semibold text-fg">{humanizeEnum(day)}</h3>
                <Badge variant={list.length === 0 ? "neutral" : "brand"}>
                  {list.length === 0 ? "Free" : `${list.length} period${list.length === 1 ? "" : "s"}`}
                </Badge>
              </div>

              {list.length === 0 ? (
                <p className="px-4 py-3 text-sm text-fg-subtle">Nothing scheduled.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {list.map((period) => (
                    <li key={period.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-32 flex-none text-xs tabular-nums text-fg-subtle">
                        {formatTimeOfDay(period.startTime)}–{formatTimeOfDay(period.endTime)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{period.subjectName}</p>
                        <p className="truncate text-xs text-fg-subtle">{period.teacherName}</p>
                      </div>
                      {period.room && (
                        <span className={cn("hidden flex-none text-xs text-fg-subtle sm:block")}>
                          {period.room}
                        </span>
                      )}
                      <PeriodDialog assignments={assignments} period={period} defaultSectionId={sectionId} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
