import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { listStudents, type StudentListRow } from "@/lib/queries/students";
import { getSectionOptions, getTeacherSectionOptions } from "@/lib/queries/academics";
import { buildHref, readEnum, readPage, readParam, type RawSearchParams } from "@/lib/search-params";
import { formatCurrency, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { FilterBar } from "@/components/filters/FilterBar";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import { NewStudentButton } from "@/components/people/NewStudentDialog";

export const metadata: Metadata = { title: "Students" };

const STATUSES = ["ACTIVE", "GRADUATED", "WITHDRAWN", "TRANSFERRED"] as const;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth(["PRINCIPAL", "TEACHER"]);
  const params = await searchParams;

  const query = readParam(params, "q");
  const sectionId = readParam(params, "section");
  const status = readEnum(params, "status", STATUSES);
  const page = readPage(params);

  // A teacher's section filter only ever offers sections they teach, so the
  // control can't suggest a class they'd be refused access to anyway.
  const sectionOptions =
    session.role === "PRINCIPAL"
      ? await getSectionOptions()
      : await getTeacherSectionOptions(session.userId);

  const { rows, total, pageSize } = await listStudents({
    session,
    query,
    sectionId,
    status,
    page,
  });

  const columns: Column<StudentListRow>[] = [
    {
      key: "name",
      header: "Student",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{row.name}</p>
            <p className="truncate text-xs text-fg-subtle">{row.admissionNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: "class",
      header: "Class",
      cell: (row) => (
        <span className="whitespace-nowrap">
          {row.className} — {row.sectionName}
        </span>
      ),
    },
    {
      key: "roll",
      header: "Roll",
      numeric: true,
      hideOnMobile: true,
      cell: (row) => row.rollNumber ?? "—",
    },
    {
      key: "guardian",
      header: "Guardian",
      hideOnMobile: true,
      cell: (row) => row.guardianName ?? <span className="text-fg-subtle">Not linked</span>,
    },
    {
      key: "attendance",
      header: "Attendance",
      numeric: true,
      cell: (row) =>
        row.attendancePercent === null ? (
          <span className="text-fg-subtle">—</span>
        ) : (
          <Badge
            variant={
              row.attendancePercent >= 85 ? "success" : row.attendancePercent >= 70 ? "warning" : "danger"
            }
          >
            {formatPercent(row.attendancePercent, 0)}
          </Badge>
        ),
    },
    {
      key: "dues",
      header: "Outstanding",
      numeric: true,
      cell: (row) =>
        row.outstandingAmount > 0 ? (
          <span className="font-medium text-danger">{formatCurrency(row.outstandingAmount)}</span>
        ) : (
          <span className="text-fg-subtle">Clear</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      cell: (row) => <StudentStatusBadge status={row.status} />,
    },
  ];

  const hasFilters = Boolean(query || sectionId || status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Students"
        description={
          session.role === "PRINCIPAL"
            ? "Every student enrolled in the current academic year."
            : "Students in the classes you teach."
        }
        actions={
          session.role === "PRINCIPAL" ? (
            <NewStudentButton
              sections={sectionOptions.map((section) => ({ value: section.id, label: section.label }))}
            />
          ) : undefined
        }
      />

      <FilterBar
        search={<SearchInput placeholder="Search by name or admission number…" className="w-full sm:max-w-xs" />}
        filters={[
          {
            name: "section",
            label: "Class",
            value: sectionId,
            placeholder: "All classes",
            options: sectionOptions.map((section) => ({ value: section.id, label: section.label })),
          },
          {
            name: "status",
            label: "Status",
            value: status,
            placeholder: "All statuses",
            options: STATUSES.map((value) => ({
              value,
              label: value.charAt(0) + value.slice(1).toLowerCase(),
            })),
          },
        ]}
        clearHref={hasFilters ? "/students" : undefined}
      />

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Students, with attendance and outstanding fees"
        rowHref={(row) => `/students/${row.id}`}
        empty={
          <EmptyState
            icon={GraduationCap}
            title={hasFilters ? "No students match these filters" : "No students yet"}
            description={
              hasFilters
                ? "Try a different class, status or search term."
                : "Students will appear here once they've been enrolled for the current academic year."
            }
          />
        }
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(nextPage) => buildHref("/students", params, { page: nextPage })}
      />
    </div>
  );
}
