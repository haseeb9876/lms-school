import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { listDatesheets } from "@/lib/queries/datesheets";
import { getSectionOptions, getTeacherSectionOptions } from "@/lib/queries/academics";
import { getTermOptions } from "@/lib/queries/exams";
import { buildHref, readPage, readParam, type RawSearchParams } from "@/lib/search-params";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { FilterBar } from "@/components/filters/FilterBar";
import { DatesheetCard } from "@/components/datesheets/DatesheetCard";
import { NewDatesheetButton } from "@/components/datesheets/NewDatesheetDialog";

export const metadata: Metadata = { title: "Exam Datesheets" };

export default async function DatesheetsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth();
  const params = await searchParams;

  const termId = readParam(params, "term");
  const sectionId = readParam(params, "section");
  const page = readPage(params);

  const [{ rows, total, pageSize }, sections, terms] = await Promise.all([
    listDatesheets({ userId: session.userId, role: session.role, termId, sectionId, page }),
    // A student or guardian only ever sees their own classes here, so the
    // filter can't be used to discover what other classes exist.
    session.role === "PRINCIPAL"
      ? getSectionOptions()
      : session.role === "TEACHER"
        ? getTeacherSectionOptions(session.userId)
        : Promise.resolve([]),
    getTermOptions(),
  ]);

  const filtered = Boolean(termId || sectionId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Exam Datesheets"
        description={
          session.role === "PRINCIPAL"
            ? "Publish the examination timetable — upload a photo of it, type it out, or both."
            : "Examination timetables, most recent first."
        }
        actions={session.role === "PRINCIPAL" ? <NewDatesheetButton sections={sections} terms={terms} /> : undefined}
      />

      <FilterBar
        clearHref={filtered ? "/datesheets" : undefined}
        filters={[
          ...(terms.length > 0
            ? [
                {
                  name: "term",
                  label: "Term",
                  value: termId,
                  placeholder: "All terms",
                  options: terms.map((term) => ({ value: term.id, label: term.name })),
                },
              ]
            : []),
          ...(sections.length > 0
            ? [
                {
                  name: "section",
                  label: "Class",
                  value: sectionId,
                  placeholder: "All classes",
                  options: sections.map((section) => ({ value: section.id, label: section.label })),
                },
              ]
            : []),
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={filtered ? "No datesheets match those filters" : "No datesheets yet"}
          description={
            filtered
              ? "Clear the filters to see every datesheet."
              : session.role === "PRINCIPAL"
                ? "Publish one by uploading a photo of the exam timetable, or by typing the papers and dates."
                : "The school hasn't published an examination timetable yet. You'll be notified when it does."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((datesheet) => (
            <DatesheetCard key={datesheet.id} datesheet={datesheet} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(next) => buildHref("/datesheets", params, { page: next })}
      />
    </div>
  );
}
