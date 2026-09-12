import type { Metadata } from "next";
import { FileBarChart, Medal, TrendingUp } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { assertCanViewStudent } from "@/lib/auth/rbac";
import { guardPage } from "@/lib/auth/page-guards";
import { getStudentAcademicRecord } from "@/lib/queries/academic-record";
import { getChildrenForParent, getStudentSection } from "@/lib/queries/timetable";
import { getBrandingSettings } from "@/lib/branding";
import { prisma } from "@/lib/db";
import { readParam, type RawSearchParams } from "@/lib/search-params";
import { formatPercent } from "@/lib/format";
import { isPassing } from "@/lib/grading";
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
    await guardPage(() => assertCanViewStudent(session, child.id));

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

  const records = await getStudentAcademicRecord(studentId);

  // The most recent examination is what the page is really about; the
  // earlier ones are context for it.
  const latest = records[0];
  const subjects = latest?.subjects ?? [];
  const failing = subjects.filter((subject) => !isPassing(subject.percent)).length;
  const best =
    subjects.length > 0 ? subjects.reduce((a, b) => (a.percent > b.percent ? a : b)) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={session.role === "STUDENT" ? "My results" : "Results"}
        description={`${studentName} · ${sectionLabel}`}
        actions={<PrintButton label="Print result card" />}
      />

      {childPicker}

      {latest && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-print-hide>
          <StatCard
            label={latest.examName}
            value={formatPercent(latest.percent, 1)}
            icon={TrendingUp}
            tone={latest.percent >= 60 ? "success" : "warning"}
            hint={`Grade ${latest.grade}`}
          />
          <StatCard
            label="Position in class"
            value={latest.position === null ? "—" : `${latest.position} of ${latest.classSize}`}
            icon={Medal}
            tone={latest.position !== null && latest.position <= 3 ? "success" : "neutral"}
          />
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
            hint={`${records.length} exam${records.length === 1 ? "" : "s"} on record`}
          />
        </div>
      )}

      <ResultCard
        studentName={studentName}
        sectionLabel={sectionLabel}
        schoolName={branding.schoolName}
        records={records}
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
