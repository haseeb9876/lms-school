import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, ClipboardCheck, ClipboardList } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { getSectionOptions, getTeacherSectionOptions } from "@/lib/queries/academics";
import { getAttendanceOverview } from "@/lib/queries/attendance";
import {
  getStudentAttendanceSummary,
  getStudentRecentAttendance,
} from "@/lib/queries/student-detail";
import { prisma } from "@/lib/db";
import { readParam, type RawSearchParams } from "@/lib/search-params";
import { formatDate, formatPercent, todaySchoolDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar, toneForPercent } from "@/components/ui/Progress";
import { DateNavigator } from "@/components/filters/DateNavigator";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth();
  const params = await searchParams;

  if (session.role === "STUDENT" || session.role === "PARENT") {
    return <MyAttendance userId={session.userId} />;
  }

  const today = todaySchoolDate();
  const date = readParam(params, "date") ?? today;
  const dateUtc = new Date(`${date}T00:00:00.000Z`);

  const sections =
    session.role === "PRINCIPAL"
      ? await getSectionOptions()
      : await getTeacherSectionOptions(session.userId);

  const overview = await getAttendanceOverview(
    sections.map((section) => section.id),
    dateUtc
  );

  const totalStudents = overview.reduce((sum, row) => sum + row.studentCount, 0);
  const totalMarked = overview.reduce((sum, row) => sum + (row.markedCount ?? 0), 0);
  const totalPresent = overview.reduce((sum, row) => sum + row.presentCount, 0);
  const pendingRegisters = overview.filter((row) => row.markedCount === null).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        description={
          session.role === "PRINCIPAL"
            ? "Daily registers across every class."
            : "Registers for the classes you teach."
        }
        actions={<DateNavigator value={date} max={today} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={totalStudents} icon={ClipboardList} tone="neutral" />
        <StatCard
          label="Marked"
          value={totalMarked}
          icon={ClipboardCheck}
          tone={pendingRegisters === 0 ? "success" : "warning"}
          hint={`${overview.length - pendingRegisters} of ${overview.length} registers`}
        />
        <StatCard
          label="Present"
          value={totalPresent}
          icon={CalendarCheck}
          tone="success"
          hint={totalMarked > 0 ? formatPercent((totalPresent / totalMarked) * 100, 1) : "Not marked yet"}
        />
        <StatCard
          label="Registers pending"
          value={pendingRegisters}
          icon={ClipboardList}
          tone={pendingRegisters > 0 ? "danger" : "success"}
          invertTrend
        />
      </div>

      <DataTable
        rows={overview}
        getRowKey={(row) => row.sectionId}
        caption={`Attendance registers for ${formatDate(dateUtc)}`}
        columns={[
          { key: "class", header: "Class", cell: (row) => row.label },
          { key: "students", header: "Students", numeric: true, cell: (row) => row.studentCount },
          {
            key: "status",
            header: "Register",
            cell: (row) =>
              row.markedCount === null ? (
                <Badge variant="warning" dot>
                  Not taken
                </Badge>
              ) : (
                <Badge variant="success" dot>
                  Marked
                </Badge>
              ),
          },
          {
            key: "present",
            header: "Present",
            numeric: true,
            cell: (row) => (row.markedCount === null ? "—" : `${row.presentCount} / ${row.markedCount}`),
          },
          {
            key: "percent",
            header: "Attendance",
            hideOnMobile: true,
            cell: (row) =>
              row.percent === null ? (
                <span className="text-fg-subtle">—</span>
              ) : (
                <ProgressBar value={row.percent} tone={toneForPercent(row.percent)} showValue className="w-28" />
              ),
          },
          {
            key: "action",
            header: "",
            align: "right",
            cell: (row) => (
              <Link
                href={`/attendance/mark?section=${row.sectionId}&date=${date}`}
                className="inline-flex h-8 items-center rounded-md border border-line bg-surface px-3 text-xs font-medium text-fg transition-colors hover:bg-surface-hover"
              >
                {row.markedCount === null ? "Take register" : "Edit"}
              </Link>
            ),
          },
        ]}
        empty={
          <EmptyState
            icon={ClipboardList}
            title="No classes assigned"
            description={
              session.role === "PRINCIPAL"
                ? "Create classes and sections for the current academic year to start taking attendance."
                : "You aren't assigned to any classes for the current academic year."
            }
          />
        }
      />
    </div>
  );
}

/** A student's own record — same route, entirely different question. */
async function MyAttendance({ userId }: { userId: string }) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No student record"
        description="This account isn't linked to a student profile yet."
      />
    );
  }

  const [summary, records] = await Promise.all([
    getStudentAttendanceSummary(profile.id),
    getStudentRecentAttendance(profile.id, 60),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My attendance" description="Your attendance record for this academic year." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Attendance"
          value={summary.percent === null ? "—" : formatPercent(summary.percent, 1)}
          icon={CalendarCheck}
          tone={summary.percent !== null && summary.percent >= 85 ? "success" : "warning"}
          hint={`${summary.total} days marked`}
        />
        <StatCard label="Present" value={summary.present} icon={CalendarCheck} tone="success" />
        <StatCard label="Absent" value={summary.absent} icon={CalendarCheck} tone="danger" />
        <StatCard label="Late" value={summary.late} icon={CalendarCheck} tone="warning" />
      </div>

      <DataTable
        rows={records}
        getRowKey={(row) => row.id}
        caption="Your attendance history"
        columns={[
          { key: "date", header: "Date", cell: (row) => formatDate(row.date) },
          { key: "status", header: "Status", cell: (row) => <AttendanceStatusBadge status={row.status} /> },
          {
            key: "remarks",
            header: "Remarks",
            hideOnMobile: true,
            cell: (row) => row.remarks ?? <span className="text-fg-subtle">—</span>,
          },
        ]}
        empty={
          <EmptyState
            icon={CalendarCheck}
            title="No attendance recorded"
            description="Your attendance will appear here once your teacher marks the register."
          />
        }
      />
    </div>
  );
}
