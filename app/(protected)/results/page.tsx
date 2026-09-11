import type { Metadata } from "next";
import { FileBarChart, TrendingUp } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { assertCanViewStudent } from "@/lib/auth/rbac";
import { getStudentResultCard } from "@/lib/queries/exams";
import { getChildrenForParent, getStudentSection } from "@/lib/queries/timetable";
import { getBrandingSettings } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { readParam, type RawSearchParams } from "@/lib/search-params";
import { formatPercent } from "@/lib/format";
import { gradeForPercentage, isPassing } from "@/lib/grading";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/filters/FilterBar";
import { ResultCard } from "@/components/exams/ResultCard";
import { PrintButton } from "@/components/ui/PrintButton";

export const metadata: Metadata = { title: "Results" };

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth(["STUDENT", "PARENT"]);
  const params = await searchParams;
  const branding = await getBrandingSettings();

  let studentId: string;
  let studentName: string;
  let sectionLabel: string;
  let childPicker: React.ReactNode = null;

  if (session.role === "STUDENT") {
    const enrollment = await getStudentSection(session.userId);
    if (!enrollment) return <NotEnrolled />;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.userId },
      select: { name: true },
    });

    studentId = enrollment.studentId;
    studentName = user.name;
    sectionLabel = enrollment.label;
  } else {
    const children = await getChildrenForParent(session.userId);
    if (children.length === 0) return <NotEnrolled />;

    const requested = readParam(params, "child");
    const child = children.find((candidate) => candidate.id === requested) ?? children[0];

    // The picker only offers this guardian's own children, but the id still
    // arrives from the URL — so it's authorised rather than assumed.
    await assertCanViewStudent(session, child.id);

    studentId = child.id;
    studentName = child.name;
    sectionLabel = child.sectionLabel;

    if (children.length > 1) {
      childPicker = (
        <FilterBar
          filters={[
            {
              name: "child",
              label: "Child",
              value: child.id,
              placeholder: "Select a child",
              options: children.map((candidate) => ({ value: candidate.id, label: candidate.name })),
            },
          ]}
        />
      );
    }
  }

  const results = await getStudentResultCard(studentId);

  const obtained = results.reduce((sum, result) => sum + result.marksObtained, 0);
  const total = results.reduce((sum, result) => sum + result.totalMarks, 0);
  const overall = total > 0 ? (obtained / total) * 100 : null;
  const failing = results.filter((result) => !isPassing(result.percent)).length;
  const best = results.length > 0 ? results.reduce((a, b) => (a.percent > b.percent ? a : b)) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={session.role === "STUDENT" ? "My results" : "Results"}
        description={`${studentName} · ${sectionLabel}`}
        actions={<PrintButton label="Print result card" />}
      />

      {childPicker}

      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-print-hide>
          <StatCard
            label="Overall"
            value={overall === null ? "—" : formatPercent(overall, 1)}
            icon={TrendingUp}
            tone={overall !== null && overall >= 60 ? "success" : "warning"}
            hint={overall === null ? undefined : `Grade ${gradeForPercentage(overall)}`}
          />
          <StatCard label="Subjects assessed" value={results.length} icon={FileBarChart} tone="neutral" />
          <StatCard
            label="Best subject"
            value={best ? best.subjectName : "—"}
            icon={TrendingUp}
            tone="success"
            hint={best ? formatPercent(best.percent, 0) : undefined}
          />
          <StatCard
            label="Below pass mark"
            value={failing}
            icon={FileBarChart}
            tone={failing > 0 ? "danger" : "success"}
            invertTrend
          />
        </div>
      )}

      <ResultCard
        studentName={studentName}
        sectionLabel={sectionLabel}
        schoolName={branding.schoolName}
        results={results}
      />
    </div>
  );
}

function NotEnrolled() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Results" />
      <EmptyState
        icon={FileBarChart}
        title="No enrolment found"
        description="Results appear here once enrolment for the current academic year is complete."
      />
    </div>
  );
}
