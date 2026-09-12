import Link from "next/link";
import {
  ClipboardList,
  GraduationCap,
  LifeBuoy,
  Megaphone,
  TrendingUp,
  UserSquare,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getSectionOptions } from "@/lib/queries/academics";
import { getAttendanceOverview, getAttendanceTrend } from "@/lib/queries/attendance";
import { getFeeSummary } from "@/lib/queries/fees";
import { getRecentAnnouncements } from "@/lib/queries/announcements";
import type { SessionInfo } from "@/lib/auth/current-user";
import { formatCurrency, formatPercent, formatRelativeTime, todaySchoolDate } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Greeting } from "./Greeting";
import { AttendanceTrendChart } from "@/components/charts/TrendCharts";

export async function PrincipalDashboard({
  session,
  userName,
}: {
  session: SessionInfo;
  userName: string;
}) {
  const today = todaySchoolDate();
  const todayUtc = new Date(`${today}T00:00:00.000Z`);
  const sections = await getSectionOptions();

  const [studentCount, teacherCount, openTickets, overview, trend, feeSummary, announcements] =
    await Promise.all([
      prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "TEACHER", status: "ACTIVE" } }),
      prisma.deskTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      getAttendanceOverview(sections.map((section) => section.id), todayUtc),
      getAttendanceTrend("ALL", 21),
      getFeeSummary(session),
      getRecentAnnouncements(session.userId, "PRINCIPAL", 3),
    ]);

  const pendingRegisters = overview.filter((row) => row.markedCount === null);
  const markedToday = overview.filter((row) => row.markedCount !== null);
  const presentToday = markedToday.reduce((sum, row) => sum + row.presentCount, 0);
  const totalMarkedToday = markedToday.reduce((sum, row) => sum + (row.markedCount ?? 0), 0);
  const attendanceToday = totalMarkedToday > 0 ? (presentToday / totalMarkedToday) * 100 : null;

  const collectionRate =
    feeSummary.billed > 0 ? (feeSummary.collected / feeSummary.billed) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <Greeting name={userName} subtitle="Here's how the school is running today." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active students"
          value={studentCount}
          icon={GraduationCap}
          tone="brand"
          href="/students"
        />
        <StatCard label="Teachers" value={teacherCount} icon={UserSquare} tone="info" href="/teachers" />
        <StatCard
          label="Attendance today"
          value={attendanceToday === null ? "Not marked" : formatPercent(attendanceToday, 1)}
          icon={TrendingUp}
          tone={attendanceToday === null ? "neutral" : attendanceToday >= 85 ? "success" : "warning"}
          hint={`${markedToday.length} of ${overview.length} registers taken`}
          href="/attendance"
        />
        <StatCard
          label="Outstanding fees"
          value={formatCurrency(feeSummary.outstanding)}
          icon={Wallet}
          tone={feeSummary.outstanding > 0 ? "warning" : "success"}
          hint={collectionRate === null ? undefined : `${formatPercent(collectionRate, 0)} collected`}
          invertTrend
          href="/fees"
        />
      </div>

      {/*
        What needs a decision today, above the analytics. A dashboard that
        opens with a chart makes you hunt for the thing that's actually gone
        wrong; this section disappears entirely when nothing has.
      */}
      {(pendingRegisters.length > 0 || openTickets > 0 || feeSummary.overdueCount > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pendingRegisters.length > 0 && (
              <Link
                href="/attendance"
                className="flex items-center gap-2.5 rounded-md border border-warning/20 bg-warning-soft px-3 py-2.5 text-sm text-warning transition-opacity hover:opacity-90"
              >
                <ClipboardList className="h-4 w-4 flex-none" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  {pendingRegisters.length} register{pendingRegisters.length === 1 ? "" : "s"} not yet
                  taken today
                </span>
                <span className="hidden truncate text-xs opacity-80 sm:block">
                  {pendingRegisters
                    .slice(0, 3)
                    .map((row) => row.label)
                    .join(", ")}
                  {pendingRegisters.length > 3 ? "…" : ""}
                </span>
              </Link>
            )}

            {feeSummary.overdueCount > 0 && (
              <Link
                href="/fees?status=OVERDUE"
                className="flex items-center gap-2.5 rounded-md border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger transition-opacity hover:opacity-90"
              >
                <Wallet className="h-4 w-4 flex-none" aria-hidden="true" />
                {feeSummary.overdueCount} overdue invoice{feeSummary.overdueCount === 1 ? "" : "s"}
              </Link>
            )}

            {openTickets > 0 && (
              <Link
                href="/helpdesk?status=OPEN"
                className="flex items-center gap-2.5 rounded-md border border-info/20 bg-info-soft px-3 py-2.5 text-sm text-info transition-opacity hover:opacity-90"
              >
                <LifeBuoy className="h-4 w-4 flex-none" aria-hidden="true" />
                {openTickets} help desk ticket{openTickets === 1 ? "" : "s"} awaiting a reply
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <AttendanceTrendChart data={trend} />

      <Card>
        <CardHeader>
          <CardTitle>Latest announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No announcements"
              description="Publish an announcement to reach students, guardians or staff."
            />
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
