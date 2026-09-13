import Link from "next/link";
import { BookOpen, CalendarDays, ClipboardList, ScrollText, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getTeacherSectionOptions } from "@/lib/queries/academics";
import { getAttendanceOverview } from "@/lib/queries/attendance";
import { getTeacherTimetable } from "@/lib/queries/timetable";
import { formatTimeOfDay, todaySchoolDate } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Greeting } from "./Greeting";
import { QuickActions } from "./QuickActions";
import { UpcomingDatesheetBanner } from "@/components/datesheets/UpcomingDatesheetBanner";
import { currentDayOfWeek } from "@/components/timetable/TimetableGrid";

export async function TeacherDashboard({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const today = todaySchoolDate();
  const todayUtc = new Date(`${today}T00:00:00.000Z`);
  const todayDow = currentDayOfWeek();

  const sections = await getTeacherSectionOptions(userId);
  const sectionIds = sections.map((section) => section.id);

  const [timetable, overview, studentCount, ungraded, upcomingAssignments] = await Promise.all([
    getTeacherTimetable(userId),
    getAttendanceOverview(sectionIds, todayUtc),
    sectionIds.length > 0
      ? prisma.enrollment.count({ where: { sectionId: { in: sectionIds }, status: "ACTIVE" } })
      : Promise.resolve(0),
    // Work handed in but not yet marked — the teacher's actual to-do list.
    prisma.submission.count({
      where: {
        assignment: { teacherId: userId },
        submittedAt: { not: null },
        marksObtained: null,
      },
    }),
    prisma.assignment.findMany({
      where: { teacherId: userId, dueDate: { gte: new Date() } },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        dueDate: true,
        subject: { select: { name: true } },
        section: { select: { name: true, class: { select: { name: true } } } },
      },
    }),
  ]);

  const todaysPeriods = timetable
    .filter((slot) => slot.dayOfWeek === todayDow)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const pendingRegisters = overview.filter((row) => row.markedCount === null);

  return (
    <div className="flex flex-col gap-6">
      <Greeting name={userName} subtitle={`You have ${todaysPeriods.length} period${todaysPeriods.length === 1 ? "" : "s"} today.`} />
      <UpcomingDatesheetBanner userId={userId} role="TEACHER" />
      <QuickActions role="TEACHER" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="My classes" value={sections.length} icon={BookOpen} tone="brand" href="/classes" />
        <StatCard label="Students" value={studentCount} icon={Users} tone="info" href="/students" />
        <StatCard
          label="Registers to take"
          value={pendingRegisters.length}
          icon={ClipboardList}
          tone={pendingRegisters.length > 0 ? "warning" : "success"}
          invertTrend
          href="/attendance"
        />
        <StatCard
          label="Awaiting marking"
          value={ungraded}
          icon={ScrollText}
          tone={ungraded > 0 ? "warning" : "success"}
          invertTrend
          href="/assignments"
        />
      </div>

      {pendingRegisters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registers still to take</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {pendingRegisters.map((row) => (
              <Link
                key={row.sectionId}
                href={`/attendance/mark?section=${row.sectionId}&date=${today}`}
                className="inline-flex items-center gap-2 rounded-md border border-warning/20 bg-warning-soft px-3 py-2 text-sm font-medium text-warning transition-opacity hover:opacity-90"
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                {row.label}
                <span className="text-xs opacity-80">{row.studentCount} students</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s periods</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysPeriods.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No periods today"
                description="Your timetable has nothing scheduled for today."
              />
            ) : (
              <ul className="divide-y divide-line">
                {todaysPeriods.map((slot) => (
                  <li key={slot.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-24 flex-none text-xs tabular-nums text-fg-subtle">
                      {formatTimeOfDay(slot.startTime)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{slot.subjectName}</p>
                      <p className="truncate text-xs text-fg-subtle">{slot.sectionLabel}</p>
                    </div>
                    {slot.room && <Badge variant="neutral">{slot.room}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignments due soon</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAssignments.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="Nothing due"
                description="Assignments you set with a future due date will appear here."
              />
            ) : (
              <ul className="divide-y divide-line">
                {upcomingAssignments.map((assignment) => (
                  <li key={assignment.id} className="py-2.5">
                    <Link
                      href={`/assignments/${assignment.id}`}
                      className="text-sm font-medium text-fg hover:text-brand"
                    >
                      {assignment.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-fg-subtle">
                      {assignment.subject.name} · {assignment.section.class.name} —{" "}
                      {assignment.section.name} · due{" "}
                      {new Intl.DateTimeFormat("en-PK", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Karachi",
                      }).format(assignment.dueDate)}
                    </p>
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
