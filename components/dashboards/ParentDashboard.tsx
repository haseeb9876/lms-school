import Link from "next/link";
import { CalendarCheck, Megaphone, Users, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { getChildrenForParent } from "@/lib/queries/timetable";
import { getAttendancePercentByStudent } from "@/lib/queries/analytics";
import { getRecentAnnouncements } from "@/lib/queries/announcements";
import { formatCurrency, formatPercent, formatRelativeTime } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar, toneForPercent } from "@/components/ui/Progress";
import { Greeting } from "./Greeting";

export async function ParentDashboard({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const children = await getChildrenForParent(userId);

  if (children.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Greeting name={userName} subtitle="No students are linked to your account yet." />
        <EmptyState
          icon={Users}
          title="No students linked"
          description="Contact the school office to have your children linked to this account."
        />
      </div>
    );
  }

  const studentIds = children.map((child) => child.id);

  const [attendance, invoiceGroups, announcements, recentResults] = await Promise.all([
    getAttendancePercentByStudent(studentIds),
    prisma.feeInvoice.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds }, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
      _sum: { totalAmount: true },
    }),
    getRecentAnnouncements(userId, "PARENT", 3),
    prisma.examResult.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { enteredAt: "desc" },
      take: 5,
      select: {
        id: true,
        marksObtained: true,
        grade: true,
        student: { select: { id: true, user: { select: { name: true } } } },
        exam: {
          select: { name: true, totalMarks: true, subject: { select: { name: true } } },
        },
      },
    }),
  ]);

  const outstandingBy = new Map(
    invoiceGroups.map((group) => [group.studentId, group._sum.totalAmount ?? 0])
  );
  const totalOutstanding = [...outstandingBy.values()].reduce((sum, value) => sum + value, 0);

  const attendanceValues = studentIds
    .map((id) => attendance.get(id))
    .filter((value): value is number => value !== undefined);
  const averageAttendance =
    attendanceValues.length > 0
      ? attendanceValues.reduce((sum, value) => sum + value, 0) / attendanceValues.length
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Greeting
        name={userName}
        subtitle={`${children.length} child${children.length === 1 ? "" : "ren"} at the school.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Children" value={children.length} icon={Users} tone="brand" href="/children" />
        <StatCard
          label="Average attendance"
          value={averageAttendance === null ? "—" : formatPercent(averageAttendance, 1)}
          icon={CalendarCheck}
          tone={averageAttendance !== null && averageAttendance >= 85 ? "success" : "warning"}
        />
        <StatCard
          label="Fees due"
          value={totalOutstanding > 0 ? formatCurrency(totalOutstanding) : "Clear"}
          icon={Wallet}
          tone={totalOutstanding > 0 ? "danger" : "success"}
          invertTrend
          href="/fees"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My children</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-line">
            {children.map((child) => {
              const percent = attendance.get(child.id) ?? null;
              const outstanding = outstandingBy.get(child.id) ?? 0;

              return (
                <li key={child.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Avatar name={child.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/results?child=${child.id}`}
                      className="truncate text-sm font-medium text-fg hover:text-brand"
                    >
                      {child.name}
                    </Link>
                    <p className="truncate text-xs text-fg-subtle">{child.sectionLabel}</p>
                  </div>

                  {percent !== null && (
                    <ProgressBar
                      value={percent}
                      tone={toneForPercent(percent)}
                      showValue
                      className="w-28 flex-none"
                    />
                  )}

                  {outstanding > 0 ? (
                    <Badge variant="danger">{formatCurrency(outstanding)} due</Badge>
                  ) : (
                    <Badge variant="success">Fees clear</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {recentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {recentResults.map((result) => (
                <li key={result.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">
                      {result.exam.subject.name}
                    </p>
                    <p className="truncate text-xs text-fg-subtle">
                      {/* Which child, since a guardian may have several. */}
                      {result.student.user.name} · {result.exam.name}
                    </p>
                  </div>
                  <span className="flex-none text-sm tabular-nums text-fg-muted">
                    {result.marksObtained} / {result.exam.totalMarks}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No announcements"
              description="Notices from the school will appear here."
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
