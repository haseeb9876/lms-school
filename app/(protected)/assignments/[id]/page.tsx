import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, ScrollText, Users } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { assertTeachesSection } from "@/lib/auth/rbac";
import { guardPage } from "@/lib/auth/page-guards";
import {
  getAssignmentDetail,
  getAssignmentRoster,
  getMySubmission,
} from "@/lib/queries/assignments";
import { getStudentSection } from "@/lib/queries/timetable";
import { formatDate, formatDateTime, formatPercent, formatRelativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { GradingTable } from "@/components/assignments/GradingTable";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const assignment = await getAssignmentDetail(id);
  return { title: assignment.title };
}

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth(["PRINCIPAL", "TEACHER", "STUDENT"]);
  const { id } = await params;

  const assignment = await getAssignmentDetail(id);
  const sectionLabel = `${assignment.section.class.name} — ${assignment.section.name}`;

  if (session.role === "STUDENT") {
    // A student may only open an assignment set for their own class.
    const enrollment = await getStudentSection(session.userId);
    if (!enrollment || enrollment.sectionId !== assignment.sectionId) {
      // redirect() rather than forbidden(): the latter needs the
      // experimental authInterrupts flag, which this app doesn't enable, so
      // calling it would throw instead of refusing. /unauthorized is how
      // every other refusal in the app already lands.
      redirect("/unauthorized");
    }

    const submission = await getMySubmission(id, session.userId);
    const overdue = assignment.dueDate < new Date();

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: "Assignments", href: "/assignments" }, { label: assignment.title }]}
          title={assignment.title}
          description={`${assignment.subject.name} · set by ${assignment.teacher.name}`}
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Due"
            value={formatDate(assignment.dueDate)}
            icon={CalendarDays}
            tone={overdue && !submission?.submittedAt ? "danger" : "neutral"}
            hint={formatRelativeTime(assignment.dueDate)}
          />
          <StatCard label="Total marks" value={assignment.maxMarks} icon={ScrollText} tone="neutral" />
          <StatCard
            label="Your marks"
            value={
              submission?.marksObtained === null || submission?.marksObtained === undefined
                ? "—"
                : `${submission.marksObtained} / ${assignment.maxMarks}`
            }
            icon={CheckCircle2}
            tone={submission?.marksObtained !== null && submission?.marksObtained !== undefined ? "success" : "neutral"}
            hint={
              submission?.marksObtained != null
                ? formatPercent((submission.marksObtained / assignment.maxMarks) * 100, 0)
                : undefined
            }
          />
          <StatCard
            label="Status"
            value={submission?.status === "GRADED" ? "Graded" : submission?.submittedAt ? "Submitted" : "Not submitted"}
            icon={CheckCircle2}
            tone={submission?.status === "GRADED" ? "success" : submission?.submittedAt ? "info" : overdue ? "danger" : "warning"}
          />
        </div>

        {assignment.description && (
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
                {assignment.description}
              </p>
            </CardContent>
          </Card>
        )}

        {submission?.feedback && (
          <Card>
            <CardHeader>
              <CardTitle>Teacher&apos;s feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-fg-muted">{submission.feedback}</p>
            </CardContent>
          </Card>
        )}

        {!submission?.submittedAt && (
          <Alert variant={overdue ? "danger" : "info"} title={overdue ? "This assignment is overdue" : "Not submitted yet"}>
            Hand your work to {assignment.teacher.name}. Once it&apos;s marked, your grade and feedback
            will appear here.
          </Alert>
        )}
      </div>
    );
  }

  // Staff view — grading.
  await guardPage(() => assertTeachesSection(session, assignment.sectionId));
  const roster = await getAssignmentRoster(id, assignment.sectionId);

  const submitted = roster.filter((row) => row.submission?.submittedAt).length;
  const graded = roster.filter((row) => row.submission?.marksObtained !== null && row.submission?.marksObtained !== undefined).length;
  const gradedMarks = roster
    .map((row) => row.submission?.marksObtained)
    .filter((marks): marks is number => marks !== null && marks !== undefined);
  const average =
    gradedMarks.length > 0
      ? (gradedMarks.reduce((sum, marks) => sum + marks, 0) / gradedMarks.length / assignment.maxMarks) * 100
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Assignments", href: "/assignments" }, { label: assignment.title }]}
        title={assignment.title}
        description={
          <>
            {assignment.subject.name} ·{" "}
            <Link href={`/classes/${assignment.sectionId}`} className="hover:text-brand">
              {sectionLabel}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={roster.length} icon={Users} tone="neutral" />
        <StatCard
          label="Submitted"
          value={`${submitted} / ${roster.length}`}
          icon={CheckCircle2}
          tone={submitted === roster.length ? "success" : "warning"}
        />
        <StatCard
          label="Graded"
          value={`${graded} / ${roster.length}`}
          icon={CheckCircle2}
          tone={graded === roster.length ? "success" : "warning"}
        />
        <StatCard
          label="Class average"
          value={average === null ? "—" : formatPercent(average, 1)}
          icon={ScrollText}
          tone={average === null ? "neutral" : average >= 60 ? "success" : "warning"}
        />
      </div>

      {assignment.description && (
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
              {assignment.description}
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-fg">Marks</h2>
          <Badge variant="neutral">
            Due {formatDateTime(assignment.dueDate)} · out of {assignment.maxMarks}
          </Badge>
        </div>

        {roster.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students enrolled"
            description="There are no active students in this class to grade."
          />
        ) : (
          <GradingTable
            assignmentId={id}
            maxMarks={assignment.maxMarks}
            rows={roster.map((row) => ({
              studentId: row.studentId,
              name: row.name,
              rollNumber: row.rollNumber,
              admissionNumber: row.admissionNumber,
              submission: row.submission
                ? {
                    status: row.submission.status,
                    submittedAt: row.submission.submittedAt,
                    marksObtained: row.submission.marksObtained,
                    feedback: row.submission.feedback,
                  }
                : null,
            }))}
          />
        )}
      </div>
    </div>
  );
}
