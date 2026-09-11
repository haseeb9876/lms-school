import { FileBarChart } from "lucide-react";
import type { SubjectResult } from "@/lib/queries/exams";
import { formatDate, formatPercent } from "@/lib/format";
import { gradeForPercentage, gradeTone, isPassing } from "@/lib/grading";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressRing, toneForPercent } from "@/components/ui/Progress";

/**
 * A student's results grouped by examination.
 *
 * Grouping matters: a flat list of twenty rows answers "what did I score in
 * Physics" but never "how did I do in the mid-terms", which is the question
 * a student and their guardian actually open this page with.
 */
export function ResultCard({
  studentName,
  sectionLabel,
  schoolName,
  results,
}: {
  studentName: string;
  sectionLabel: string;
  schoolName: string;
  results: SubjectResult[];
}) {
  if (results.length === 0) {
    return (
      <EmptyState
        icon={FileBarChart}
        title="No results yet"
        description="Examination results will appear here once they've been published."
      />
    );
  }

  const groups = new Map<string, SubjectResult[]>();
  for (const result of results) {
    const key = `${result.termName} — ${result.examName}`;
    const list = groups.get(key) ?? [];
    list.push(result);
    groups.set(key, list);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Only shown on paper: a printed result card has to identify the
          school and student on its own, away from the app's chrome. */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{schoolName}</h1>
        <p className="text-sm">
          Result card — {studentName} ({sectionLabel})
        </p>
      </div>

      {[...groups.entries()].map(([title, subjects]) => {
        const obtained = subjects.reduce((sum, subject) => sum + subject.marksObtained, 0);
        const total = subjects.reduce((sum, subject) => sum + subject.totalMarks, 0);
        const percent = total > 0 ? (obtained / total) * 100 : 0;

        return (
          <section
            key={title}
            className="overflow-hidden rounded-lg border border-line bg-surface-raised shadow-soft"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-fg">{title}</h2>
                <p className="mt-0.5 text-sm text-fg-subtle">
                  {subjects.length} subject{subjects.length === 1 ? "" : "s"} ·{" "}
                  {formatDate(subjects[0].examDate)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-fg-subtle">Total</p>
                  <p className="text-lg font-semibold tabular-nums text-fg">
                    {obtained} / {total}
                  </p>
                </div>
                <div className="print:hidden">
                  <ProgressRing value={percent} size={72} tone={toneForPercent(percent)} />
                </div>
                <Badge variant={gradeTone(gradeForPercentage(percent))}>
                  {gradeForPercentage(percent)}
                </Badge>
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
                  {subjects.map((subject) => (
                    <tr key={`${subject.subjectName}-${subject.examName}`} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 font-medium text-fg">{subject.subjectName}</td>
                      <td data-numeric className="px-4 py-2.5 text-right text-fg-muted">
                        {subject.marksObtained} / {subject.totalMarks}
                      </td>
                      <td data-numeric className="px-4 py-2.5 text-right text-fg-muted">
                        {formatPercent(subject.percent, 1)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={gradeTone(subject.grade)}>
                          {subject.grade ?? gradeForPercentage(subject.percent)}
                        </Badge>
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
