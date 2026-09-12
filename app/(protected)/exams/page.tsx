import type { Metadata } from "next";
import { FileBarChart } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { listExams, getTermOptions, type ExamListRow } from "@/lib/queries/exams";
import {
  getSectionOptions,
  getSubjectOptions,
  getTeacherSectionOptions,
} from "@/lib/queries/academics";
import { buildHref, readPage, readParam, type RawSearchParams } from "@/lib/search-params";
import { formatDate, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/filters/FilterBar";
import { NewExamButton } from "@/components/exams/NewExamDialog";

export const metadata: Metadata = { title: "Exams & Results" };

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth(["PRINCIPAL", "TEACHER"]);
  const params = await searchParams;

  const sectionId = readParam(params, "section");
  const subjectId = readParam(params, "subject");
  const termId = readParam(params, "term");
  const page = readPage(params);

  const [{ rows, total, pageSize }, sections, subjects, terms] = await Promise.all([
    listExams({ session, sectionId, subjectId, termId, page }),
    session.role === "PRINCIPAL" ? getSectionOptions() : getTeacherSectionOptions(session.userId),
    getSubjectOptions(),
    getTermOptions(),
  ]);

  const columns: Column<ExamListRow>[] = [
    {
      key: "exam",
      header: "Examination",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{row.name}</p>
          <p className="truncate text-xs text-fg-subtle">
            {row.subjectName} · {row.sectionLabel}
          </p>
        </div>
      ),
    },
    { key: "term", header: "Term", hideOnMobile: true, cell: (row) => row.termName },
    { key: "date", header: "Date", cell: (row) => formatDate(row.examDate) },
    {
      key: "entered",
      header: "Marks entered",
      numeric: true,
      cell: (row) =>
        row.resultCount === 0 ? (
          <Badge variant="warning" dot>
            Pending
          </Badge>
        ) : (
          <span className="tabular-nums">
            {row.resultCount} / {row.rosterSize}
          </span>
        ),
    },
    {
      key: "average",
      header: "Average",
      numeric: true,
      cell: (row) =>
        row.averagePercent === null ? (
          <span className="text-fg-subtle">—</span>
        ) : (
          <Badge
            variant={
              row.averagePercent >= 70 ? "success" : row.averagePercent >= 50 ? "info" : "warning"
            }
          >
            {formatPercent(row.averagePercent, 1)}
          </Badge>
        ),
    },
    {
      key: "total",
      header: "Total marks",
      numeric: true,
      hideOnMobile: true,
      cell: (row) => row.totalMarks,
    },
  ];

  const hasFilters = Boolean(sectionId || subjectId || termId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Exams & Results"
        description="Examinations across your classes, and how far marking has got."
        actions={
          <NewExamButton
            terms={terms.map((t) => ({ value: t.id, label: t.name }))}
            subjects={subjects.map((s) => ({ value: s.id, label: s.name }))}
            sections={sections.map((s) => ({ value: s.id, label: s.label }))}
          />
        }
      />

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
          {
            name: "term",
            label: "Term",
            value: termId,
            placeholder: "All terms",
            options: terms.map((t) => ({ value: t.id, label: t.name })),
          },
        ]}
        clearHref={hasFilters ? "/exams" : undefined}
      />

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Examinations"
        rowHref={(row) => `/exams/${row.id}`}
        empty={
          <EmptyState
            icon={FileBarChart}
            title={hasFilters ? "No exams match these filters" : "No exams scheduled"}
            description={
              hasFilters
                ? "Try a different class, subject or term."
                : "Examinations will appear here once they've been scheduled."
            }
          />
        }
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(nextPage) => buildHref("/exams", params, { page: nextPage })}
      />
    </div>
  );
}
