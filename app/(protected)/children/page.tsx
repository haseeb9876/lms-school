import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, FileBarChart, Users, Wallet } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { getChildrenForParent } from "@/lib/queries/timetable";
import { getSectionAttendanceByStudent } from "@/lib/queries/classes";
import { prisma } from "@/lib/db";
import { formatCurrency, formatPercent, humanizeEnum } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar, toneForPercent } from "@/components/ui/Progress";

export const metadata: Metadata = { title: "My Children" };

export default async function ChildrenPage() {
  const session = await requireAuth(["PARENT"]);
  const children = await getChildrenForParent(session.userId);

  if (children.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="My children" />
        <EmptyState
          icon={Users}
          title="No students linked"
          description="No student records are linked to this account yet. Contact the school office if this looks wrong."
        />
      </div>
    );
  }

  const studentIds = children.map((child) => child.id);

  // Attendance, outstanding fees and latest results for all children in
  // three grouped queries rather than three per child.
  const [attendance, invoiceGroups, resultGroups] = await Promise.all([
    getSectionAttendanceByStudent(studentIds),
    prisma.feeInvoice.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds }, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
      _sum: { totalAmount: true },
    }),
    prisma.examResult.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds } },
      _count: { _all: true },
    }),
  ]);

  const outstandingBy = new Map(
    invoiceGroups.map((group) => [group.studentId, group._sum.totalAmount ?? 0])
  );
  const resultsBy = new Map(resultGroups.map((group) => [group.studentId, group._count._all]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My children"
        description="Attendance, results and fees for each of your children."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {children.map((child) => {
          const percent = attendance.get(child.id) ?? null;
          const outstanding = outstandingBy.get(child.id) ?? 0;
          const resultCount = resultsBy.get(child.id) ?? 0;

          return (
            <div
              key={child.id}
              className="flex flex-col gap-4 rounded-lg border border-line bg-surface-raised p-5 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <Avatar name={child.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-fg">{child.name}</p>
                  <p className="truncate text-sm text-fg-subtle">
                    {child.sectionLabel}
                    {child.rollNumber ? ` · Roll ${child.rollNumber}` : ""}
                  </p>
                </div>
                <Badge variant="neutral">{humanizeEnum(child.relationship)}</Badge>
              </div>

              {percent !== null && (
                <ProgressBar value={percent} tone={toneForPercent(percent)} label="Attendance" showValue />
              )}

              <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4">
                <div>
                  <dt className="flex items-center gap-1 text-xs text-fg-subtle">
                    <CalendarCheck className="h-3 w-3" aria-hidden="true" />
                    Attendance
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">
                    {percent === null ? "—" : formatPercent(percent, 0)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-fg-subtle">
                    <FileBarChart className="h-3 w-3" aria-hidden="true" />
                    Results
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-fg">{resultCount}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-fg-subtle">
                    <Wallet className="h-3 w-3" aria-hidden="true" />
                    Fees due
                  </dt>
                  <dd
                    className={`mt-0.5 text-sm font-semibold tabular-nums ${
                      outstanding > 0 ? "text-danger" : "text-success"
                    }`}
                  >
                    {outstanding > 0 ? formatCurrency(outstanding) : "Clear"}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <Link
                  href={`/results?child=${child.id}`}
                  className="inline-flex h-8 items-center rounded-md border border-line bg-surface px-3 text-xs font-medium text-fg transition-colors hover:bg-surface-hover"
                >
                  Results
                </Link>
                <Link
                  href={`/timetable?child=${child.id}`}
                  className="inline-flex h-8 items-center rounded-md border border-line bg-surface px-3 text-xs font-medium text-fg transition-colors hover:bg-surface-hover"
                >
                  Timetable
                </Link>
                <Link
                  href="/fees"
                  className="inline-flex h-8 items-center rounded-md border border-line bg-surface px-3 text-xs font-medium text-fg transition-colors hover:bg-surface-hover"
                >
                  Fees
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
