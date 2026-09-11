import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardCheck, Users } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { assertTeachesSection } from "@/lib/auth/rbac";
import { getClassDetail, getSectionAttendanceByStudent } from "@/lib/queries/classes";
import { readEnum, type RawSearchParams } from "@/lib/search-params";
import { formatPercent, todaySchoolDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import { TimetableGrid, currentDayOfWeek } from "@/components/timetable/TimetableGrid";

const TABS = ["students", "subjects", "timetable"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const section = await getClassDetail(id);
  return { title: `${section.class.name} — ${section.name}` };
}

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth(["PRINCIPAL", "TEACHER"]);
  const { id } = await params;

  // A teacher may only open a section they actually teach.
  await assertTeachesSection(session, id);

  const tab: Tab = readEnum(await searchParams, "tab", TABS) ?? "students";
  const section = await getClassDetail(id);
  const label = `${section.class.name} — ${section.name}`;

  const attendanceByStudent = await getSectionAttendanceByStudent(
    section.roster.map((student) => student.id)
  );

  const averageAttendance =
    attendanceByStudent.size > 0
      ? [...attendanceByStudent.values()].reduce((sum, value) => sum + value, 0) /
        attendanceByStudent.size
      : null;

  const subjectCount = new Set(section.teacherAssignments.map((a) => a.subject.id)).size;
  const base = `/classes/${id}`;
  const tabHref = (value: Tab) => (value === "students" ? base : `${base}?tab=${value}`);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Classes", href: "/classes" }, { label }]}
        title={label}
        description={
          section.classTeacher
            ? `Class teacher: ${section.classTeacher.name}`
            : "No class teacher assigned"
        }
        actions={
          <Link href={`/attendance/mark?section=${id}&date=${todaySchoolDate()}`}>
            <Button size="sm">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              Take register
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={section.roster.length} icon={Users} tone="brand" />
        <StatCard label="Subjects" value={subjectCount} icon={BookOpen} tone="info" />
        <StatCard
          label="Average attendance"
          value={averageAttendance === null ? "—" : formatPercent(averageAttendance, 1)}
          icon={ClipboardCheck}
          tone={averageAttendance !== null && averageAttendance >= 85 ? "success" : "warning"}
        />
        <StatCard
          label="Capacity"
          value={section.capacity ? `${section.roster.length} / ${section.capacity}` : "—"}
          icon={Users}
          tone="neutral"
        />
      </div>

      <Tabs
        current={tabHref(tab)}
        items={[
          { label: "Students", href: tabHref("students"), count: section.roster.length },
          { label: "Subjects", href: tabHref("subjects"), count: subjectCount },
          { label: "Timetable", href: tabHref("timetable") },
        ]}
      />

      {tab === "students" && (
        <DataTable
          rows={section.roster}
          getRowKey={(row) => row.id}
          caption={`Students in ${label}`}
          rowHref={(row) => `/students/${row.id}`}
          columns={[
            {
              key: "roll",
              header: "Roll",
              numeric: true,
              cell: (row) => row.rollNumber ?? "—",
            },
            {
              key: "name",
              header: "Student",
              cell: (row) => (
                <div className="flex items-center gap-2.5">
                  <Avatar name={row.user.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">{row.user.name}</p>
                    <p className="truncate text-xs text-fg-subtle">{row.admissionNumber}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "attendance",
              header: "Attendance",
              numeric: true,
              cell: (row) => {
                const percent = attendanceByStudent.get(row.id);
                if (percent === undefined) return <span className="text-fg-subtle">—</span>;
                return (
                  <Badge variant={percent >= 85 ? "success" : percent >= 70 ? "warning" : "danger"}>
                    {formatPercent(percent, 0)}
                  </Badge>
                );
              },
            },
            {
              key: "status",
              header: "Status",
              hideOnMobile: true,
              cell: (row) => <StudentStatusBadge status={row.status} />,
            },
          ]}
          empty={
            <EmptyState
              icon={Users}
              title="No students enrolled"
              description="Enrol students into this section to see them here."
            />
          }
        />
      )}

      {tab === "subjects" && (
        <DataTable
          rows={section.teacherAssignments}
          getRowKey={(row) => row.id}
          caption={`Subjects taught in ${label}`}
          columns={[
            { key: "subject", header: "Subject", cell: (row) => row.subject.name },
            { key: "code", header: "Code", hideOnMobile: true, cell: (row) => row.subject.code },
            {
              key: "teacher",
              header: "Teacher",
              cell: (row) => (
                <Link
                  href={`/teachers/${row.teacher.id}`}
                  className="text-fg transition-colors hover:text-brand"
                >
                  {row.teacher.name}
                </Link>
              ),
            },
          ]}
          empty={
            <EmptyState
              icon={BookOpen}
              title="No subjects assigned"
              description="Assign teachers to subjects for this section to build its timetable."
            />
          }
        />
      )}

      {tab === "timetable" && (
        <TimetableGrid
          highlightDay={currentDayOfWeek()}
          entries={section.timetableSlots.map((slot) => ({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room,
            subjectName: slot.subject.name,
            teacherName: slot.teacher.name,
          }))}
        />
      )}
    </div>
  );
}
