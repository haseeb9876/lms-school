import type { Metadata } from "next";
import { CalendarCheck, FileBarChart, ScrollText, Wallet } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { assertCanViewStudent } from "@/lib/auth/rbac";
import { guardPage } from "@/lib/auth/page-guards";
import { logAudit } from "@/lib/audit";
import {
  getStudentAttendanceSummary,
  getStudentDetail,
  getStudentInvoices,
  getStudentRecentAttendance,
  getStudentResults,
  getStudentSubmissions,
  revealCnic,
} from "@/lib/queries/student-detail";
import { readEnum, type RawSearchParams } from "@/lib/search-params";
import { formatCurrency, formatDate, formatDateTime, formatPercent, humanizeEnum } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { ProgressRing, toneForPercent } from "@/components/ui/Progress";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { InvoiceStatusBadge } from "@/components/fees/InvoiceStatusBadge";
import { UserStatusButton } from "@/components/people/UserStatusButton";
import { ResetPasswordButton } from "@/components/people/ResetPasswordButton";

const TABS = ["overview", "attendance", "results", "fees"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const student = await getStudentDetail(id);
  return { title: student.user.name };
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="text-sm text-fg">{value}</dd>
    </div>
  );
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  // Throws before any record is read into the page, so an unauthorised
  // viewer never reaches a render that could leak a name in an error.
  await guardPage(() => assertCanViewStudent(session, id));

  const tab: Tab = readEnum(await searchParams, "tab", TABS) ?? "overview";
  const student = await getStudentDetail(id);

  const sectionLabel = student.enrollments[0]
    ? `${student.enrollments[0].section.class.name} — ${student.enrollments[0].section.name}`
    : "Not enrolled";

  const [attendance, invoices] = await Promise.all([
    getStudentAttendanceSummary(id),
    getStudentInvoices(id),
  ]);

  const outstanding = invoices
    .filter((invoice) => ["PENDING", "OVERDUE", "PARTIAL"].includes(invoice.status))
    .reduce((sum, invoice) => {
      const paid = invoice.payments.reduce((total, payment) => total + payment.amountPaid, 0);
      return sum + (invoice.totalAmount - paid);
    }, 0);

  // Opening a student's record exposes their personal details, so the view
  // itself is recorded — the schema defines STUDENT_PII_VIEWED precisely so
  // that "who looked at this child's file" is answerable after the fact.
  await logAudit({
    actorId: session.userId,
    action: "STUDENT_PII_VIEWED",
    targetType: "StudentProfile",
    targetId: id,
    metadata: { tab },
  });

  const base = `/students/${id}`;
  const tabHref = (value: Tab) => (value === "overview" ? base : `${base}?tab=${value}`);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Students", href: "/students" }, { label: student.user.name }]}
        title={student.user.name}
        description={`${student.admissionNumber} · ${sectionLabel}`}
        actions={
          session.role === "PRINCIPAL" ? (
            <div className="flex flex-wrap gap-2">
              <ResetPasswordButton userId={student.user.id} name={student.user.name} />
              <UserStatusButton
                userId={student.user.id}
                name={student.user.name}
                status={student.user.status}
              />
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface-raised p-5 shadow-soft">
        <Avatar name={student.user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-fg">{student.user.name}</p>
            <StudentStatusBadge status={student.status} />
            {student.user.status === "SUSPENDED" && <Badge variant="danger">Login suspended</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-fg-subtle">
            Roll {student.rollNumber ?? "—"} · {sectionLabel}
          </p>
        </div>
        {attendance.percent !== null && (
          <ProgressRing
            value={attendance.percent}
            tone={toneForPercent(attendance.percent)}
            label="Attendance"
          />
        )}
      </div>

      <Tabs
        current={tabHref(tab)}
        items={[
          { label: "Overview", href: tabHref("overview") },
          { label: "Attendance", href: tabHref("attendance") },
          { label: "Results", href: tabHref("results") },
          { label: "Fees", href: tabHref("fees"), count: invoices.length },
        ]}
      />

      {tab === "overview" && <OverviewTab student={student} outstanding={outstanding} attendance={attendance} />}
      {tab === "attendance" && <AttendanceTab studentId={id} attendance={attendance} />}
      {tab === "results" && <ResultsTab studentId={id} />}
      {tab === "fees" && <FeesTab invoices={invoices} outstanding={outstanding} />}
    </div>
  );
}

async function OverviewTab({
  student,
  outstanding,
  attendance,
}: {
  student: Awaited<ReturnType<typeof getStudentDetail>>;
  outstanding: number;
  attendance: Awaited<ReturnType<typeof getStudentAttendanceSummary>>;
}) {
  const submissions = await getStudentSubmissions(student.id);
  const graded = submissions.filter((s) => s.marksObtained !== null);
  const averageAssignment =
    graded.length > 0
      ? (graded.reduce((sum, s) => sum + (s.marksObtained ?? 0) / s.assignment.maxMarks, 0) / graded.length) * 100
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Attendance"
          value={attendance.percent === null ? "—" : formatPercent(attendance.percent, 0)}
          icon={CalendarCheck}
          tone="brand"
          hint={`${attendance.total} days marked`}
        />
        <StatCard
          label="Absences"
          value={attendance.absent}
          icon={CalendarCheck}
          tone={attendance.absent > 5 ? "danger" : "neutral"}
          hint={`${attendance.late} late · ${attendance.excused} excused`}
        />
        <StatCard
          label="Assignment average"
          value={averageAssignment === null ? "—" : formatPercent(averageAssignment, 0)}
          icon={ScrollText}
          tone="info"
          hint={`${graded.length} graded`}
        />
        <StatCard
          label="Outstanding fees"
          value={outstanding > 0 ? formatCurrency(outstanding) : "Clear"}
          icon={Wallet}
          tone={outstanding > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-line">
              <DetailRow label="Admission number" value={student.admissionNumber} />
              <DetailRow label="CNIC / B-Form" value={revealCnic(student.user.cnic)} />
              <DetailRow
                label="Date of birth"
                value={student.dateOfBirth ? formatDate(student.dateOfBirth) : "—"}
              />
              <DetailRow label="Gender" value={student.gender ?? "—"} />
              <DetailRow label="Admitted on" value={formatDate(student.admissionDate)} />
              <DetailRow label="Address" value={student.address ?? "—"} />
              <DetailRow
                label="Last signed in"
                value={student.user.lastLoginAt ? formatDateTime(student.user.lastLoginAt) : "Never"}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guardians</CardTitle>
          </CardHeader>
          <CardContent>
            {student.parentLinks.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="No guardian linked"
                description="Link a guardian so they can see this student's attendance, results and fees."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {student.parentLinks.map((link) => (
                  <li key={link.parent.id} className="flex items-center gap-3">
                    <Avatar name={link.parent.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{link.parent.name}</p>
                      <p className="truncate text-xs text-fg-subtle">
                        {humanizeEnum(link.relationship)}
                        {link.parent.phone ? ` · ${link.parent.phone}` : ""}
                      </p>
                    </div>
                    {link.isPrimary && <Badge variant="brand">Primary</Badge>}
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

async function AttendanceTab({
  studentId,
  attendance,
}: {
  studentId: string;
  attendance: Awaited<ReturnType<typeof getStudentAttendanceSummary>>;
}) {
  const records = await getStudentRecentAttendance(studentId, 40);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Present" value={attendance.present} icon={CalendarCheck} tone="success" />
        <StatCard label="Absent" value={attendance.absent} icon={CalendarCheck} tone="danger" />
        <StatCard label="Late" value={attendance.late} icon={CalendarCheck} tone="warning" />
        <StatCard label="Excused" value={attendance.excused} icon={CalendarCheck} tone="info" />
      </div>

      <DataTable
        rows={records}
        getRowKey={(row) => row.id}
        caption="Recent attendance"
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
            description="Attendance will appear here once a teacher marks the register."
          />
        }
      />
    </div>
  );
}

async function ResultsTab({ studentId }: { studentId: string }) {
  const results = await getStudentResults(studentId);

  return (
    <DataTable
      rows={results}
      getRowKey={(row) => row.id}
      caption="Examination results"
      columns={[
        { key: "subject", header: "Subject", cell: (row) => row.exam.subject.name },
        { key: "exam", header: "Examination", hideOnMobile: true, cell: (row) => row.exam.name },
        { key: "date", header: "Date", hideOnMobile: true, cell: (row) => formatDate(row.exam.examDate) },
        {
          key: "marks",
          header: "Marks",
          numeric: true,
          cell: (row) => `${row.marksObtained} / ${row.exam.totalMarks}`,
        },
        {
          key: "percent",
          header: "Percentage",
          numeric: true,
          cell: (row) => formatPercent((row.marksObtained / row.exam.totalMarks) * 100, 0),
        },
        {
          key: "grade",
          header: "Grade",
          cell: (row) =>
            row.grade ? (
              <Badge variant={row.grade.startsWith("A") ? "success" : row.grade === "F" ? "danger" : "neutral"}>
                {row.grade}
              </Badge>
            ) : (
              "—"
            ),
        },
      ]}
      empty={
        <EmptyState
          icon={FileBarChart}
          title="No results yet"
          description="Examination results appear here once a teacher enters them."
        />
      }
    />
  );
}

function FeesTab({
  invoices,
  outstanding,
}: {
  invoices: Awaited<ReturnType<typeof getStudentInvoices>>;
  outstanding: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Invoices" value={invoices.length} icon={Wallet} tone="neutral" />
        <StatCard
          label="Outstanding"
          value={outstanding > 0 ? formatCurrency(outstanding) : "Clear"}
          icon={Wallet}
          tone={outstanding > 0 ? "danger" : "success"}
        />
      </div>

      <DataTable
        rows={invoices}
        getRowKey={(row) => row.id}
        caption="Fee invoices"
        rowHref={(row) => `/fees/invoices/${row.id}`}
        columns={[
          { key: "invoice", header: "Invoice", cell: (row) => row.invoiceNumber },
          { key: "due", header: "Due date", cell: (row) => formatDate(row.dueDate) },
          {
            key: "amount",
            header: "Amount",
            numeric: true,
            cell: (row) => formatCurrency(row.totalAmount),
          },
          {
            key: "paid",
            header: "Paid",
            numeric: true,
            hideOnMobile: true,
            cell: (row) => formatCurrency(row.payments.reduce((sum, p) => sum + p.amountPaid, 0)),
          },
          { key: "status", header: "Status", cell: (row) => <InvoiceStatusBadge status={row.status} /> },
        ]}
        empty={
          <EmptyState
            icon={Wallet}
            title="No invoices"
            description="Fee invoices raised for this student will appear here."
          />
        }
      />
    </div>
  );
}
