import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileBarChart, TrendingUp, Users } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { assertTeachesSection } from "@/lib/auth/rbac";
import { getExamDetail, getExamRoster } from "@/lib/queries/exams";
import { formatDate, formatPercent } from "@/lib/format";
import { isPassing } from "@/lib/grading";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MarkEntryTable } from "@/components/exams/MarkEntryTable";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const exam = await getExamDetail(id);
  return { title: `${exam.name} — ${exam.subject.name}` };
}

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(["PRINCIPAL", "TEACHER"]);
  const { id } = await params;

  const exam = await getExamDetail(id);
  await assertTeachesSection(session, exam.sectionId);

  const roster = await getExamRoster(id, exam.sectionId);
  const sectionLabel = `${exam.section.class.name} — ${exam.section.name}`;

  const entered = roster.filter((row) => row.result !== null);
  const percentages = entered.map((row) => (row.result!.marksObtained / exam.totalMarks) * 100);
  const average =
    percentages.length > 0
      ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length
      : null;
  const passRate =
    percentages.length > 0
      ? (percentages.filter(isPassing).length / percentages.length) * 100
      : null;
  const highest = percentages.length > 0 ? Math.max(...percentages) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Exams & Results", href: "/exams" }, { label: exam.name }]}
        title={`${exam.subject.name} — ${exam.name}`}
        description={
          <>
            <Link href={`/classes/${exam.sectionId}`} className="hover:text-brand">
              {sectionLabel}
            </Link>
            {" · "}
            {exam.term.name} · {formatDate(exam.examDate)}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Marks entered"
          value={`${entered.length} / ${roster.length}`}
          icon={Users}
          tone={entered.length === roster.length && roster.length > 0 ? "success" : "warning"}
        />
        <StatCard
          label="Class average"
          value={average === null ? "—" : formatPercent(average, 1)}
          icon={TrendingUp}
          tone={average === null ? "neutral" : average >= 60 ? "success" : "warning"}
        />
        <StatCard
          label="Pass rate"
          value={passRate === null ? "—" : formatPercent(passRate, 0)}
          icon={FileBarChart}
          tone={passRate === null ? "neutral" : passRate >= 80 ? "success" : "danger"}
        />
        <StatCard
          label="Highest"
          value={highest === null ? "—" : formatPercent(highest, 0)}
          icon={CalendarDays}
          tone="info"
        />
      </div>

      {roster.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students enrolled"
          description="There are no active students in this class to record marks for."
        />
      ) : (
        <MarkEntryTable
          examId={id}
          totalMarks={exam.totalMarks}
          rows={roster.map((row) => ({
            studentId: row.studentId,
            name: row.name,
            rollNumber: row.rollNumber,
            admissionNumber: row.admissionNumber,
            marksObtained: row.result?.marksObtained ?? null,
          }))}
        />
      )}
    </div>
  );
}
