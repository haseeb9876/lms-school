import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, GraduationCap, TrendingUp, Wallet } from "lucide-react";
import { requireAuth, type SessionInfo } from "@/lib/auth/current-user";
import { getAttendanceTrend } from "@/lib/queries/attendance";
import {
  getAttendanceConcerns,
  getClassAttendanceAverages,
  getFeeDefaulters,
  getOverallAttendance,
} from "@/lib/queries/analytics";
import { getCollectionTrend, getFeeSummary } from "@/lib/queries/fees";
import { prisma } from "@/lib/db";
import { formatCurrency, formatPercent, formatShortDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { PrintButton } from "@/components/ui/PrintButton";
import { CardSkeleton, ChartSkeleton, StatGridSkeleton } from "@/components/ui/PageSkeleton";
import {
  AttendanceTrendChart,
  ClassAttendanceChart,
  CollectionChart,
} from "@/components/charts/TrendCharts";

export const metadata: Metadata = { title: "Reports" };

/**
 * Each panel is its own Suspense boundary, so the page frame paints
 * immediately and the slowest query doesn't hold up the rest. Previously a
 * single `Promise.all` meant every figure waited on the slowest aggregate.
 */
export default async function ReportsPage() {
  const session = await requireAuth(["PRINCIPAL"]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="How the school is doing on attendance, results and collections."
        actions={<PrintButton label="Print report" />}
      />

      <Suspense fallback={<StatGridSkeleton />}>
        <HeadlineStats session={session} />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <AttendanceTrendPanel />
      </Suspense>

      <div className="grid gap-4 xl:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <CollectionPanel />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <ClassAttendancePanel />
        </Suspense>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Suspense fallback={<CardSkeleton lines={6} />}>
          <ConcernsPanel />
        </Suspense>
        <Suspense fallback={<CardSkeleton lines={6} />}>
          <DefaultersPanel />
        </Suspense>
      </div>
    </div>
  );
}

async function HeadlineStats({ session }: { session: SessionInfo }) {
  const [studentCount, attendance, feeSummary] = await Promise.all([
    prisma.studentProfile.count({ where: { status: "ACTIVE" } }),
    getOverallAttendance(),
    getFeeSummary(session),
  ]);

  const collectionRate =
    feeSummary.billed > 0 ? (feeSummary.collected / feeSummary.billed) * 100 : null;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Active students"
        value={studentCount}
        icon={GraduationCap}
        tone="brand"
        href="/students"
      />
      <StatCard
        label="Attendance (90 days)"
        value={attendance === null ? "—" : formatPercent(attendance, 1)}
        icon={TrendingUp}
        tone={attendance !== null && attendance >= 85 ? "success" : "warning"}
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
  );
}

async function AttendanceTrendPanel() {
  const trend = await getAttendanceTrend("ALL", 30);
  return <AttendanceTrendChart data={trend} />;
}

async function CollectionPanel() {
  const collection = await getCollectionTrend(6);
  return <CollectionChart data={collection} />;
}

async function ClassAttendancePanel() {
  const classes = await getClassAttendanceAverages();
  const data = classes.filter((entry) => entry.percent > 0);
  if (data.length === 0) return null;
  return <ClassAttendanceChart data={data.map(({ label, percent }) => ({ label, percent }))} />;
}

async function ConcernsPanel() {
  const concerns = await getAttendanceConcerns("ALL", { limit: 8 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance concerns</CardTitle>
      </CardHeader>
      <CardContent>
        {concerns.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No attendance concerns"
            description="No student with a meaningful record has fallen below 75% in the last 90 days."
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
  );
}

async function DefaultersPanel() {
  const defaulters = await getFeeDefaulters(8);

  return (
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
  );
}
