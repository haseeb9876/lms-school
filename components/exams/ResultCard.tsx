import { FileBarChart, Medal, TrendingDown, TrendingUp } from "lucide-react";
import type { ExamRecord } from "@/lib/queries/academic-record";
import { formatDate, formatPercent } from "@/lib/format";
import { gradeTone, isPassing } from "@/lib/grading";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressRing, toneForPercent } from "@/components/ui/Progress";
import { cn } from "@/lib/cn";

/**
 * A student's examination history, newest first.
 *
 * Each examination is one card carrying its subject breakdown, overall
 * percentage, grade and position in class — the shape of the paper report
 * card a school already issues, so nobody has to learn a new layout to read
 * it. Earlier examinations stay on the page rather than being archived
 * away: "how is this child doing" is a question about the trend, and the
 * change against the previous exam is shown on each card for exactly that
 * reason.
 */
export function ResultCard({
  studentName,
  sectionLabel,
  schoolName,
  records,
}: {
  studentName: string;
  sectionLabel: string;
  schoolName: string;
  records: ExamRecord[];
}) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={FileBarChart}
        title="No results yet"
        description="Examination results appear here as soon as a teacher publishes them."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Only on paper: a printed result card must identify the school and
          student on its own, away from the app's chrome. */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{schoolName}</h1>
        <p className="text-sm">
          Result card — {studentName} ({sectionLabel})
        </p>
      </div>

      {records.map((record, index) => {
        // Chronological neighbour: records are newest-first, so the next
        // one in the array is the previous examination.
        const previous = records[index + 1];
        const delta = previous ? record.percent - previous.percent : null;

        return (
          <section
            key={`${record.academicYear}-${record.termName}-${record.examName}`}
            className="overflow-hidden rounded-lg border border-line bg-surface-raised shadow-soft"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-fg">{record.examName}</h2>
                <p className="mt-0.5 text-sm text-fg-subtle">
                  {record.termName} · {record.academicYear} · {record.sectionLabel} ·{" "}
                  {formatDate(record.examDate)}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {record.position !== null && (
                    <Badge variant={record.position <= 3 ? "success" : "neutral"}>
                      <Medal className="h-3 w-3" aria-hidden="true" />
                      Position {record.position} of {record.classSize}
                    </Badge>
                  )}

                  {delta !== null && Math.abs(delta) >= 0.05 && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
                        delta > 0 ? "text-success" : "text-danger"
                      )}
                    >
                      {delta > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)} points vs {previous.examName}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-fg-subtle">Total</p>
                  <p className="text-lg font-semibold tabular-nums text-fg">
                    {record.obtained} / {record.total}
                  </p>
                </div>
                <div className="print:hidden">
                  <ProgressRing value={record.percent} size={72} tone={toneForPercent(record.percent)} />
                </div>
                <Badge variant={gradeTone(record.grade)}>{record.grade}</Badge>
              </div>
            </div>

            <div className="scrollbar-subtle overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-sunken">
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      Subject
                    </th>
                    <th scope="col" data-numeric className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      Marks
                    </th>
                    <th scope="col" data-numeric className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      Percentage
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {record.subjects.map((subject) => (
                    <tr key={subject.subjectName} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 font-medium text-fg">
                        {subject.subjectName}
                        {subject.remarks && (
                          <span className="ml-2 text-xs font-normal text-fg-subtle">
                            {subject.remarks}
                          </span>
                        )}
                      </td>
                      <td data-numeric className="px-4 py-2.5 text-right text-fg-muted">
                        {subject.marksObtained} / {subject.totalMarks}
                      </td>
                      <td data-numeric className="px-4 py-2.5 text-right text-fg-muted">
                        {formatPercent(subject.percent, 1)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={gradeTone(subject.grade)}>{subject.grade ?? "—"}</Badge>
                        {!isPassing(subject.percent) && (
                          <span className="ml-2 text-xs font-medium text-danger">Below pass mark</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
