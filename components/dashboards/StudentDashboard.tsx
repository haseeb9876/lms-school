import Link from "next/link";
import { CalendarCheck, CalendarDays, FileBarChart, ScrollText, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSectionTimetable, getStudentSection } from "@/lib/queries/timetable";
import {
  getStudentAttendanceSummary,
  getStudentInvoices,
} from "@/lib/queries/student-detail";
import { getStudentResultCard } from "@/lib/queries/exams";
import { getRecentAnnouncements } from "@/lib/queries/announcements";
import { formatCurrency, formatPercent, formatRelativeTime, formatTimeOfDay } from "@/lib/format";
import { gradeForPercentage, gradeTone } from "@/lib/grading";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Greeting } from "./Greeting";
import { QuickActions } from "./QuickActions";
import { UpcomingDatesheetBanner } from "@/components/datesheets/UpcomingDatesheetBanner";
import { currentDayOfWeek } from "@/components/timetable/TimetableGrid";

export async function StudentDashboard({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const enrollment = await getStudentSection(userId);

  if (!enrollment) {
    return (
      <div className="flex flex-col gap-6">
        <Greeting name={userName} subtitle="Your account isn't linked to a class yet." />
        <EmptyState
          icon={CalendarDays}
          title="Not enrolled yet"
          description="Your timetable, attendance and results appear here once enrolment is complete."
        />
      </div>
    );
  }

  const todayDow = currentDayOfWeek();

  const [timetable, attendance, results, invoices, announcements, openAssignments] =
    await Promise.all([
      getSectionTimetable(enrollment.sectionId),
      getStudentAttendanceSummary(enrollment.studentId),
      getStudentResultCard(enrollment.studentId),
      getStudentInvoices(enrollment.studentId),
      getRecentAnnouncements(userId, "STUDENT", 3),
      prisma.assignment.findMany({
        where: { sectionId: enrollment.sectionId, dueDate: { gte: new Date() } },
        orderBy: { dueDate: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          dueDate: true,
          subject: { select: { name: true } },
        },
      }),
    ]);

  const todaysPeriods = timetable
    .filter((slot) => slot.dayOfWeek === todayDow)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const outstanding = invoices
    .filter((invoice) => ["PENDING", "OVERDUE", "PARTIAL"].includes(invoice.status))
    .reduce((sum, invoice) => {
      const paid = invoice.payments.reduce((total, payment) => total + payment.amountPaid, 0);
      return sum + (invoice.totalAmount - paid);
    }, 0);

  const obtained = results.reduce((sum, result) => sum + result.marksObtained, 0);
  const totalMarks = results.reduce((sum, result) => sum + result.totalMarks, 0);
  const overall = totalMarks > 0 ? (obtained / totalMarks) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <Greeting
        name={userName}
        subtitle={`${enrollment.label} · ${todaysPeriods.length} period${todaysPeriods.length === 1 ? "" : "s"} today.`}
      />
      <UpcomingDatesheetBanner userId={userId} role="STUDENT" />
      <QuickActions role="STUDENT" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Attendance"
          value={attendance.percent === null ? "—" : formatPercent(attendance.percent, 1)}
          icon={CalendarCheck}
          tone={attendance.percent !== null && attendance.percent >= 85 ? "success" : "warning"}
          hint={`${attendance.absent} absence${attendance.absent === 1 ? "" : "s"}`}
          href="/attendance"
        />
        <StatCard
          label="Overall result"
          value={overall === null ? "—" : formatPercent(overall, 1)}
          icon={FileBarChart}
          tone={overall !== null && overall >= 60 ? "success" : "warning"}
          hint={overall === null ? undefined : `Grade ${gradeForPercentage(overall)}`}
          href="/results"
        />
        <StatCard
          label="Open assignments"
          value={openAssignments.length}
          icon={ScrollText}
          tone={openAssignments.length > 0 ? "info" : "neutral"}
          href="/assignments"
        />
        <StatCard
          label="Fees due"
          value={outstanding > 0 ? formatCurrency(outstanding) : "Clear"}
          icon={Wallet}
          tone={outstanding > 0 ? "danger" : "success"}
          invertTrend
          href="/fees"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s timetable</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysPeriods.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No classes today"
                description="Enjoy the day off — check the timetable for the rest of the week."
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
                      <p className="truncate text-xs text-fg-subtle">{slot.teacherName}</p>
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
            {openAssignments.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="Nothing due"
                description="You're all caught up — new work will show up here."
              />
            ) : (
              <ul className="divide-y divide-line">
                {openAssignments.map((assignment) => (
                  <li key={assignment.id} className="py-2.5">
                    <Link
                      href={`/assignments/${assignment.id}`}
                      className="text-sm font-medium text-fg hover:text-brand"
                    >
                      {assignment.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-fg-subtle">
                      {assignment.subject.name} · due {formatRelativeTime(assignment.dueDate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {results.slice(0, 5).map((result, index) => (
                <li
                  key={`${result.subjectName}-${index}`}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{result.subjectName}</p>
                    <p className="truncate text-xs text-fg-subtle">{result.examName}</p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <span className="text-sm tabular-nums text-fg-muted">
                      {result.marksObtained} / {result.totalMarks}
                    </span>
                    <Badge variant={gradeTone(result.grade)}>
                      {result.grade ?? gradeForPercentage(result.percent)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {announcements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-fg">{announcement.title}</p>
                    <Badge variant="neutral">{formatRelativeTime(announcement.publishedAt)}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-fg-subtle">{announcement.body}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
