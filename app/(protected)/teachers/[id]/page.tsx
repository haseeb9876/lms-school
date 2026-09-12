import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CalendarDays, GraduationCap, Users } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { getTeacherDetail } from "@/lib/queries/staff";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { UserStatusButton } from "@/components/people/UserStatusButton";
import { ResetPasswordButton } from "@/components/people/ResetPasswordButton";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const teacher = await getTeacherDetail(id);
  return { title: teacher?.name ?? "Teacher" };
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="text-sm text-fg">{value}</dd>
    </div>
  );
}

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth(["PRINCIPAL"]);
  const { id } = await params;

  const teacher = await getTeacherDetail(id);
  if (!teacher) notFound();

  // Group the flat assignment list by section, which is how a timetable is
  // actually read: "in Grade 9 A, they teach Maths and Physics".
  const bySection = new Map<
    string,
    { label: string; sortOrder: number; sectionName: string; subjects: string[] }
  >();

  for (const assignment of teacher.teacherAssignments) {
    const key = assignment.section.id;
    const entry = bySection.get(key) ?? {
      label: `${assignment.section.class.name} — ${assignment.section.name}`,
      sortOrder: assignment.section.class.sortOrder,
      sectionName: assignment.section.name,
      subjects: [],
    };
    entry.subjects.push(assignment.subject.name);
    bySection.set(key, entry);
  }

  const sections = [...bySection.entries()].sort(
    ([, a], [, b]) => a.sortOrder - b.sortOrder || a.sectionName.localeCompare(b.sectionName)
  );

  const subjectCount = new Set(teacher.teacherAssignments.map((a) => a.subject.id)).size;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Teachers", href: "/teachers" }, { label: teacher.name }]}
        title={teacher.name}
        description={teacher.teacherProfile?.employeeId ?? "Teaching staff"}
        actions={
          <div className="flex flex-wrap gap-2">
            <ResetPasswordButton userId={teacher.id} name={teacher.name} />
            <UserStatusButton userId={teacher.id} name={teacher.name} status={teacher.status} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface-raised p-5 shadow-soft">
        <Avatar name={teacher.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-fg">{teacher.name}</p>
            {teacher.status === "SUSPENDED" && <Badge variant="danger">Suspended</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-fg-subtle">
            {teacher.teacherProfile?.qualification ?? "Qualification not recorded"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Subjects" value={subjectCount} icon={BookOpen} tone="brand" />
        <StatCard label="Classes" value={sections.length} icon={Users} tone="info" />
        <StatCard
          label="Class teacher of"
          value={teacher.classesAsTeacher.length}
          icon={GraduationCap}
          tone="success"
        />
        <StatCard
          label="Joined"
          value={
            teacher.teacherProfile?.joiningDate
              ? formatDate(teacher.teacherProfile.joiningDate)
              : formatDate(teacher.createdAt)
          }
          icon={CalendarDays}
          tone="neutral"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Staff details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-line">
              <DetailRow label="Employee ID" value={teacher.teacherProfile?.employeeId ?? "—"} />
              <DetailRow label="Email" value={teacher.email ?? "—"} />
              <DetailRow label="Phone" value={teacher.phone ?? "—"} />
              <DetailRow
                label="Joining date"
                value={
                  teacher.teacherProfile?.joiningDate
                    ? formatDate(teacher.teacherProfile.joiningDate)
                    : "—"
                }
              />
              <DetailRow
                label="Last signed in"
                value={teacher.lastLoginAt ? formatDateTime(teacher.lastLoginAt) : "Never"}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teaching assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {sections.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No assignments"
                description="This teacher hasn't been assigned any subjects for the current academic year."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {sections.map(([sectionId, entry]) => (
                  <li key={sectionId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <Link
                      href={`/classes/${sectionId}`}
                      className="text-sm font-medium text-fg transition-colors hover:text-brand"
                    >
                      {entry.label}
                    </Link>
                    <div className="flex flex-wrap justify-end gap-1">
                      {entry.subjects.map((subject) => (
                        <Badge key={subject} variant="neutral">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
