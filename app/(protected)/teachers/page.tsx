import type { Metadata } from "next";
import { UserSquare } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { listTeachers, type TeacherListRow } from "@/lib/queries/staff";
import { buildHref, readPage, readParam, type RawSearchParams } from "@/lib/search-params";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/filters/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { NewTeacherButton } from "@/components/people/NewTeacherDialog";

export const metadata: Metadata = { title: "Teachers" };

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAuth(["PRINCIPAL"]);
  const params = await searchParams;

  // Suggest the next free employee ID so the common case needs no decision.
  const lastEmployee = await prisma.teacherProfile.findFirst({
    where: { employeeId: { startsWith: "EMP-" } },
    orderBy: { employeeId: "desc" },
    select: { employeeId: true },
  });
  const lastSequence = lastEmployee ? Number.parseInt(lastEmployee.employeeId.slice(4), 10) : 0;
  const suggestedEmployeeId = `EMP-${String((Number.isFinite(lastSequence) ? lastSequence : 0) + 1).padStart(3, "0")}`;

  const query = readParam(params, "q");
  const page = readPage(params);
  const { rows, total, pageSize } = await listTeachers({ query, page });

  const columns: Column<TeacherListRow>[] = [
    {
      key: "name",
      header: "Teacher",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{row.name}</p>
            <p className="truncate text-xs text-fg-subtle">{row.employeeId ?? "No employee ID"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "qualification",
      header: "Qualification",
      hideOnMobile: true,
      cell: (row) => row.qualification ?? <span className="text-fg-subtle">—</span>,
    },
    {
      key: "load",
      header: "Teaching load",
      cell: (row) => (
        <span className="whitespace-nowrap">
          {row.subjectCount} subject{row.subjectCount === 1 ? "" : "s"} · {row.sectionCount} class
          {row.sectionCount === 1 ? "" : "es"}
        </span>
      ),
    },
    {
      key: "classTeacher",
      header: "Class teacher of",
      cell: (row) =>
        row.isClassTeacherOf.length === 0 ? (
          <span className="text-fg-subtle">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.isClassTeacherOf.map((label) => (
              <Badge key={label} variant="brand">
                {label}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "contact",
      header: "Contact",
      hideOnMobile: true,
      cell: (row) => row.phone ?? row.email ?? <span className="text-fg-subtle">—</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) =>
        row.status === "ACTIVE" ? (
          <Badge variant="success" dot>
            Active
          </Badge>
        ) : (
          <Badge variant="danger" dot>
            Suspended
          </Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teachers"
        description="Teaching staff and their assigned classes."
        actions={<NewTeacherButton suggestedEmployeeId={suggestedEmployeeId} />}
      />

      <FilterBar
        search={<SearchInput placeholder="Search teachers…" className="w-full sm:max-w-xs" />}
        clearHref={query ? "/teachers" : undefined}
      />

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Teaching staff"
        rowHref={(row) => `/teachers/${row.id}`}
        empty={
          <EmptyState
            icon={UserSquare}
            title={query ? "No teachers match that search" : "No teachers yet"}
            description={
              query
                ? "Try a different name, employee ID or CNIC."
                : "Teaching staff will appear here once their accounts are created."
            }
          />
        }
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(nextPage) => buildHref("/teachers", params, { page: nextPage })}
      />
    </div>
  );
}
