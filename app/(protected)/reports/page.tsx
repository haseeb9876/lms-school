import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, GraduationCap, TrendingUp, Wallet } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { getAttendanceConcerns, getAttendanceTrend } from "@/lib/queries/attendance";
import { getCollectionTrend, getFeeDefaulters, getFeeSummary } from "@/lib/queries/fees";
import { listClasses, getSectionAttendanceByStudent } from "@/lib/queries/classes";
import { prisma } from "@/lib/db";
import { formatCurrency, formatPercent, formatShortDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { PrintButton } from "@/components/ui/PrintButton";
import {
  AttendanceTrendChart,
  ClassAttendanceChart,
  CollectionChart,
} from "@/components/charts/TrendCharts";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await requireAuth(["PRINCIPAL"]);

  const [trend, collection, feeSummary, defaulters, concerns, classes, studentCount] =
    await Promise.all([
      getAttendanceTrend("ALL", 30),
      getCollectionTrend(6),
      getFeeSummary(session),
      getFeeDefaulters(8),
      getAttendanceConcerns("ALL", 75, 8),
      listClasses("ALL"),
      prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
    ]);

  // Per-class averages, built from one grouped attendance query over every
  // enrolled student rather than a query per section.
  const enrollments = await prisma.enrollment.findMany({
    select: { studentId: true, sectionId: true },
  });
  const attendanceByStudent = await getSectionAttendanceByStudent(
    enrollments.map((enrollment) => enrollment.studentId)
  );

  const perClass = new Map<string, { sum: number; count: number }>();
  for (const enrollment of enrollments) {
    const percent = attendanceByStudent.get(enrollment.studentId);
    if (percent === undefined) continue;
    const entry = perClass.get(enrollment.sectionId) ?? { sum: 0, count: 0 };
    entry.sum += percent;
    entry.count += 1;
    perClass.set(enrollment.sectionId, entry);
  }

  const classAttendance = classes
    .map((section) => {
      const entry = perClass.get(section.id);
      return {
        label: section.label.replace(" — ", " "),
        percent: entry && entry.count > 0 ? entry.sum / entry.count : 0,
      };
    })
    .filter((entry) => entry.percent > 0);

  const overallAttendance =
    classAttendance.length > 0
      ? classAttendance.reduce((sum, entry) => sum + entry.percent, 0) / classAttendance.length
      : null;

  const collectionRate =
    feeSummary.billed > 0 ? (feeSummary.collected / feeSummary.billed) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="How the school is doing on attendance, results and collections."
        actions={<PrintButton label="Print report" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active students"
          value={studentCount}
          icon={GraduationCap}
          tone="brand"
          href="/students"
        />
        <StatCard
          label="Average attendance"
          value={overallAttendance === null ? "—" : formatPercent(overallAttendance, 1)}
          icon={TrendingUp}
          tone={overallAttendance !== null && overallAttendance >= 85 ? "success" : "warning"}
        />
        <StatCard
          label="Collection rate"
          value={collectionRate === null ? "—" : formatPercent(collectionRate, 1)}
          icon={Wallet}
          tone={collectionRate !== null && collectionRate >= 80 ? "success" : "warning"}
          hint={formatCurrency(feeSummary.collected)}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(feeSummary.outstanding)}
          icon={AlertTriangle}
          tone={feeSummary.outstanding > 0 ? "danger" : "success"}
          invertTrend
          href="/fees?status=OVERDUE"
        />
      </div>

      <AttendanceTrendChart
        data={trend.map((point) => ({ ...point, date: point.date }))}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <CollectionChart data={collection} />
        {classAttendance.length > 0 && <ClassAttendanceChart data={classAttendance} />}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance concerns</CardTitle>
          </CardHeader>
          <CardContent>
            {concerns.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No attendance concerns"
                description="No student with a meaningful record has fallen below 75%."
              />
            ) : (
              <ul className="divide-y divide-line">
                {concerns.map((student) => (
                  <li key={student.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={student.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/students/${student.id}`}
                        className="truncate text-sm font-medium text-fg hover:text-brand"
                      >
                        {student.name}
                      </Link>
                      <p className="truncate text-xs text-fg-subtle">
                        {student.label} · {student.daysMarked} days marked
                      </p>
                    </div>
                    <Badge variant={student.percent < 60 ? "danger" : "warning"}>
                      {formatPercent(student.percent, 0)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Largest outstanding balances</CardTitle>
          </CardHeader>
          <CardContent>
            {defaulters.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Nothing outstanding"
                description="Every invoice issued has been settled."
              />
            ) : (
              <ul className="divide-y divide-line">
                {defaulters.map((student) => (
                  <li key={student.studentId} className="flex items-center gap-3 py-2.5">
                    <Avatar name={student.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/students/${student.studentId}?tab=fees`}
                        className="truncate text-sm font-medium text-fg hover:text-brand"
                      >
                        {student.name}
                      </Link>
                      <p className="truncate text-xs text-fg-subtle">
                        {student.label} · {student.invoiceCount} invoice
                        {student.invoiceCount === 1 ? "" : "s"} · oldest due{" "}
                        {formatShortDate(student.oldestDue)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-danger">
                      {formatCurrency(student.balance)}
                    </span>
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
