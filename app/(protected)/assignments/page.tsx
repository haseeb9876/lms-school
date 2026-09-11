import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { listAssignments, type AssignmentListRow } from "@/lib/queries/assignments";
import {
  getSectionOptions,
  getSubjectOptions,
  getTeacherSectionOptions,
} from "@/lib/queries/academics";
import { buildHref, readPage, readParam, type RawSearchParams } from "@/lib/search-params";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";
import { FilterBar } from "@/components/filters/FilterBar";
import { NewAssignmentButton } from "@/components/assignments/NewAssignmentDialog";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth(["PRINCIPAL", "TEACHER", "STUDENT"]);
  const params = await searchParams;

  const sectionId = readParam(params, "section");
  const subjectId = readParam(params, "subject");
  const page = readPage(params);

  const { rows, total, pageSize } = await listAssignments({
    session,
    sectionId,
    subjectId,
    page,
  });

  const isStaff = session.role === "PRINCIPAL" || session.role === "TEACHER";

  const [sections, subjects] = isStaff
    ? await Promise.all([
        session.role === "PRINCIPAL" ? getSectionOptions() : getTeacherSectionOptions(session.userId),
        getSubjectOptions(),
      ])
    : [[], []];

  const staffColumns: Column<AssignmentListRow>[] = [
    {
      key: "title",
      header: "Assignment",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{row.title}</p>
          <p className="truncate text-xs text-fg-subtle">
            {row.subjectName} · {row.sectionLabel}
          </p>
        </div>
      ),
    },
    {
      key: "due",
      header: "Due",
      cell: (row) => {
        const overdue = row.dueDate < new Date();
        return (
          <div className="whitespace-nowrap">
            <p className={overdue ? "text-fg-muted" : "font-medium text-fg"}>{formatDate(row.dueDate)}</p>
            <p className="text-xs text-fg-subtle">{formatRelativeTime(row.dueDate)}</p>
          </div>
        );
      },
    },
    {
      key: "submissions",
      header: "Submitted",
      numeric: true,
      cell: (row) => `${row.submissionCount} / ${row.rosterSize}`,
    },
    {
      key: "graded",
      header: "Graded",
      hideOnMobile: true,
      cell: (row) => (
        <ProgressBar
          value={row.submissionCount > 0 ? (row.gradedCount / row.submissionCount) * 100 : 0}
          tone={row.gradedCount === row.submissionCount && row.submissionCount > 0 ? "success" : "warning"}
          showValue
          className="w-24"
        />
      ),
    },
    { key: "marks", header: "Marks", numeric: true, hideOnMobile: true, cell: (row) => row.maxMarks },
  ];

  const studentColumns: Column<AssignmentListRow>[] = [
    {
      key: "title",
      header: "Assignment",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{row.title}</p>
          <p className="truncate text-xs text-fg-subtle">{row.subjectName}</p>
        </div>
      ),
    },
    {
      key: "due",
      header: "Due",
      cell: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-fg">{formatDate(row.dueDate)}</p>
          <p className="text-xs text-fg-subtle">{formatRelativeTime(row.dueDate)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        if (row.myStatus === "GRADED") {
          return (
            <Badge variant="success" dot>
              Graded
            </Badge>
          );
        }
        if (row.myStatus === "SUBMITTED") {
          return (
            <Badge variant="info" dot>
              Submitted
            </Badge>
          );
        }
        if (row.myStatus === "LATE") {
          return (
            <Badge variant="warning" dot>
              Late
            </Badge>
          );
        }
        // Nothing handed in: overdue is a problem, not-yet-due is just open.
        return row.dueDate < new Date() ? (
          <Badge variant="danger" dot>
            Missing
          </Badge>
        ) : (
          <Badge variant="neutral" dot>
            Not submitted
          </Badge>
        );
      },
    },
    {
      key: "marks",
      header: "Marks",
      numeric: true,
      cell: (row) =>
        row.myMarks === null ? (
          <span className="text-fg-subtle">—</span>
        ) : (
          <span className="font-medium text-fg">
            {row.myMarks} / {row.maxMarks}
          </span>
        ),
    },
  ];

  const hasFilters = Boolean(sectionId || subjectId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={session.role === "STUDENT" ? "My assignments" : "Assignments"}
        description={
          session.role === "STUDENT"
            ? "Work set for your class, and how you're doing on it."
            : "Work set across your classes, with submission and grading progress."
        }
        actions={
          isStaff ? (
            <NewAssignmentButton
              sections={sections.map((s) => ({ value: s.id, label: s.label }))}
              subjects={subjects.map((s) => ({ value: s.id, label: s.name }))}
            />
          ) : undefined
        }
      />

      {isStaff && (
        <FilterBar
          filters={[
            {
              name: "section",
              label: "Class",
              value: sectionId,
              placeholder: "All classes",
              options: sections.map((s) => ({ value: s.id, label: s.label })),
            },
            {
              name: "subject",
              label: "Subject",
              value: subjectId,
              placeholder: "All subjects",
              options: subjects.map((s) => ({ value: s.id, label: s.name })),
            },
          ]}
          clearHref={hasFilters ? "/assignments" : undefined}
        />
      )}

      <DataTable
        columns={isStaff ? staffColumns : studentColumns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Assignments"
        rowHref={(row) => `/assignments/${row.id}`}
        empty={
          <EmptyState
            icon={ScrollText}
            title={hasFilters ? "No assignments match these filters" : "No assignments yet"}
            description={
              isStaff
                ? "Post an assignment to set work for one of your classes."
                : "Work set by your teachers will appear here."
            }
          />
        }
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(nextPage) => buildHref("/assignments", params, { page: nextPage })}
      />
    </div>
  );
}
