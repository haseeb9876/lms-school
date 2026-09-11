import type { DayOfWeek } from "@prisma/client";
import { formatTimeOfDay } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface TimetableEntry {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string | null;
  subjectName: string;
  /** Omitted on a teacher's own timetable, where it's always them. */
  teacherName?: string;
  /** Shown on a teacher's timetable in place of the teacher name. */
  sectionLabel?: string;
}

const DAY_ORDER: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

/**
 * Stable colour per subject so the same subject keeps its colour across
 * every day of the week — that's what lets you see a timetable's shape at a
 * glance instead of reading every cell.
 */
const SUBJECT_TONES = [
  "border-chart-1/30 bg-chart-1/10 text-chart-1",
  "border-chart-2/30 bg-chart-2/10 text-chart-2",
  "border-chart-3/30 bg-chart-3/10 text-chart-3",
  "border-chart-4/30 bg-chart-4/10 text-chart-4",
  "border-chart-5/30 bg-chart-5/10 text-chart-5",
  "border-chart-6/30 bg-chart-6/10 text-chart-6",
];

function toneFor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = (hash * 31 + subject.charCodeAt(i)) | 0;
  return SUBJECT_TONES[Math.abs(hash) % SUBJECT_TONES.length];
}

function SlotCard({ entry, compact }: { entry: TimetableEntry; compact?: boolean }) {
  return (
    <div className={cn("rounded-md border p-2", toneFor(entry.subjectName))}>
      <p className={cn("truncate font-semibold", compact ? "text-xs" : "text-sm")}>{entry.subjectName}</p>
      <p className="mt-0.5 truncate text-[11px] opacity-80">
        {formatTimeOfDay(entry.startTime)}–{formatTimeOfDay(entry.endTime)}
      </p>
      {(entry.teacherName || entry.sectionLabel) && (
        <p className="truncate text-[11px] opacity-80">{entry.sectionLabel ?? entry.teacherName}</p>
      )}
      {entry.room && <p className="truncate text-[11px] opacity-60">{entry.room}</p>}
    </div>
  );
}

export function TimetableGrid({ entries, highlightDay }: { entries: TimetableEntry[]; highlightDay?: DayOfWeek }) {
  const byDay = new Map<DayOfWeek, TimetableEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.dayOfWeek) ?? [];
    list.push(entry);
    byDay.set(entry.dayOfWeek, list);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const days = DAY_ORDER.filter((day) => (byDay.get(day)?.length ?? 0) > 0);

  if (days.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface-raised p-10 text-center">
        <p className="text-sm font-medium text-fg">No timetable set</p>
        <p className="mt-1 text-sm text-fg-subtle">Periods will appear here once the timetable is built.</p>
      </div>
    );
  }

  return (
    <>
      {/*
        Phones get a day-by-day list rather than a scaled-down grid: a six
        column × six row table at 375px is unreadable, and what you actually
        want on a phone is "what do I have today".
      */}
      <div className="flex flex-col gap-4 lg:hidden">
        {days.map((day) => (
          <section key={day}>
            <h3
              className={cn(
                "mb-2 text-sm font-semibold",
                day === highlightDay ? "text-brand" : "text-fg"
              )}
            >
              {DAY_LABELS[day]}
              {day === highlightDay && <span className="ml-1.5 text-xs font-normal">· Today</span>}
            </h3>
            <div className="flex flex-col gap-2">
              {byDay.get(day)!.map((entry) => (
                <SlotCard key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="scrollbar-subtle hidden overflow-x-auto lg:block">
        <div
          className="grid min-w-[56rem] gap-3"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {days.map((day) => (
            <div key={day} className="flex flex-col gap-2">
              <h3
                className={cn(
                  "rounded-md px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide",
                  day === highlightDay ? "bg-brand-soft text-brand" : "bg-surface-hover text-fg-subtle"
                )}
              >
                {DAY_LABELS[day]}
              </h3>
              {byDay.get(day)!.map((entry) => (
                <SlotCard key={entry.id} entry={entry} compact />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Today, as a DayOfWeek — used to highlight the current column. */
export function currentDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = [
    "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
  ];
  // Read in the school's zone so "today" matches the rest of the app.
  const karachiNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
  return days[karachiNow.getDay()];
}
