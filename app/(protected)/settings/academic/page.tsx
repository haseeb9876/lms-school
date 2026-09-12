import type { Metadata } from "next";
import { BookOpen, CalendarRange, Layers, UserSquare } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { getCurrentAcademicYear } from "@/lib/queries/academics";
import { readEnum, type RawSearchParams } from "@/lib/search-params";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import {
  AssignTeacherButton,
  NewClassButton,
  NewSectionButton,
  NewSubjectButton,
  NewTermButton,
  NewYearButton,
} from "@/components/academics/SetupDialogs";
import { RemoveAssignmentButton } from "@/components/academics/RemoveAssignmentButton";

export const metadata: Metadata = { title: "Academic Setup" };

const TABS = ["year", "classes", "subjects", "staffing"] as const;
type Tab = (typeof TABS)[number];

/**
 * Where a school configures itself.
 *
 * Ordered the way it has to be done: a year exists before sections can
 * belong to it, sections and subjects exist before a teacher can be
 * assigned to both. Each tab says what it unlocks, because "add a section"
 * means nothing until you know registers depend on it.
 */
export default async function AcademicSetupPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAuth(["PRINCIPAL"]);
  const tab: Tab = readEnum(await searchParams, "tab", TABS) ?? "year";

  const currentYear = await getCurrentAcademicYear();

  const [years, classes, subjects, teachers, sections, assignments] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        terms: { orderBy: { startDate: "asc" }, select: { id: true, name: true, startDate: true, endDate: true } },
        _count: { select: { sections: true } },
      },
    }),
    prisma.class.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, sortOrder: true, _count: { select: { sections: true } } },
    }),
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        _count: { select: { teacherAssignments: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    currentYear
      ? prisma.section.findMany({
          where: { academicYearId: currentYear.id },
          orderBy: [{ class: { sortOrder: "asc" } }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            capacity: true,
            class: { select: { name: true } },
            classTeacher: { select: { name: true } },
            _count: { select: { enrollments: true } },
          },
        })
      : Promise.resolve([]),
    currentYear
      ? prisma.teacherSubjectAssignment.findMany({
          where: { academicYearId: currentYear.id },
          orderBy: [{ section: { class: { sortOrder: "asc" } } }, { section: { name: "asc" } }],
          select: {
            id: true,
            teacher: { select: { name: true } },
            subject: { select: { name: true } },
            section: { select: { name: true, class: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);

  const base = "/settings/academic";
  const tabHref = (value: Tab) => (value === "year" ? base : `${base}?tab=${value}`);

  const classOptions = classes.map((entry) => ({ value: entry.id, label: entry.name }));
  const teacherOptions = teachers.map((entry) => ({ value: entry.id, label: entry.name }));
  const subjectOptions = subjects.map((entry) => ({ value: entry.id, label: entry.name }));
  const sectionOptions = sections.map((entry) => ({
    value: entry.id,
    label: `${entry.class.name} — ${entry.name}`,
  }));
  const nextSortOrder = classes.length > 0 ? Math.max(...classes.map((c) => c.sortOrder)) + 1 : 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Academic setup"
        description="The structure everything else in the app hangs off: the year, its classes, its subjects and who teaches what."
      />

      {!currentYear && (
        <Alert variant="warning" title="No current academic year">
          Until a year is marked current, students can&apos;t be enrolled and registers can&apos;t be
          taken. Create one to get started.
        </Alert>
      )}

      <Tabs
        current={tabHref(tab)}
        items={[
          { label: "Year & terms", href: tabHref("year"), count: years.length },
          { label: "Classes", href: tabHref("classes"), count: sections.length },
          { label: "Subjects", href: tabHref("subjects"), count: subjects.length },
          { label: "Staffing", href: tabHref("staffing"), count: assignments.length },
        ]}
      />

      {tab === "year" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-fg-subtle">
              One year is current at a time. Terms group exams and fee invoices within it.
            </p>
            <div className="flex flex-wrap gap-2">
              <NewYearButton />
              {years.length > 0 && (
                <NewTermButton years={years.map((y) => ({ value: y.id, label: y.name }))} />
              )}
            </div>
          </div>

          {years.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No academic year yet"
              description="Create an academic year before adding classes or enrolling students."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {years.map((year) => (
                <li
                  key={year.id}
                  className="rounded-lg border border-line bg-surface-raised p-5 shadow-soft"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-base font-semibold text-fg">
                        {year.name}
                        {year.isCurrent && <Badge variant="success">Current</Badge>}
                      </p>
                      <p className="mt-0.5 text-sm text-fg-subtle">
                        {formatDate(year.startDate)} – {formatDate(year.endDate)} ·{" "}
                        {year._count.sections} section{year._count.sections === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  {year.terms.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                      {year.terms.map((term) => (
                        <li
                          key={term.id}
                          className="rounded-md border border-line bg-surface-sunken px-2.5 py-1.5 text-xs"
                        >
                          <span className="font-medium text-fg">{term.name}</span>
                          <span className="ml-1.5 text-fg-subtle">
                            {formatDate(term.startDate)} – {formatDate(term.endDate)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "classes" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-fg-subtle">
              A class is a grade level; a section is the group students are enrolled into.
            </p>
            <div className="flex flex-wrap gap-2">
              <NewClassButton nextSortOrder={nextSortOrder} />
              {classes.length > 0 && (
                <NewSectionButton classes={classOptions} teachers={teacherOptions} />
              )}
            </div>
          </div>

          <DataTable
            rows={sections}
            getRowKey={(row) => row.id}
            caption="Sections in the current academic year"
            rowHref={(row) => `/classes/${row.id}`}
            columns={[
              {
                key: "section",
                header: "Section",
                cell: (row) => `${row.class.name} — ${row.name}`,
              },
              {
                key: "teacher",
                header: "Class teacher",
                cell: (row) =>
                  row.classTeacher?.name ?? <span className="text-fg-subtle">Unassigned</span>,
              },
              {
                key: "students",
                header: "Students",
                numeric: true,
                cell: (row) =>
                  row.capacity
                    ? `${row._count.enrollments} / ${row.capacity}`
                    : String(row._count.enrollments),
              },
            ]}
            empty={
              <EmptyState
                icon={Layers}
                title={classes.length === 0 ? "No classes yet" : "No sections yet"}
                description={
                  classes.length === 0
                    ? "Add a class such as Grade 9, then create its sections."
                    : "Add a section so students have somewhere to be enrolled."
                }
              />
            }
          />
        </div>
      )}

      {tab === "subjects" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-fg-subtle">
              Subjects are shared across every class; what varies is who teaches them where.
            </p>
            <NewSubjectButton />
          </div>

          <DataTable
            rows={subjects}
            getRowKey={(row) => row.id}
            caption="Subjects"
            columns={[
              { key: "name", header: "Subject", cell: (row) => row.name },
              { key: "code", header: "Code", cell: (row) => <Badge variant="neutral">{row.code}</Badge> },
              {
                key: "taught",
                header: "Taught in",
                numeric: true,
                cell: (row) => `${row._count.teacherAssignments} class${row._count.teacherAssignments === 1 ? "" : "es"}`,
              },
              {
                key: "description",
                header: "Description",
                hideOnMobile: true,
                cell: (row) => row.description ?? <span className="text-fg-subtle">—</span>,
              },
            ]}
            empty={
              <EmptyState
                icon={BookOpen}
                title="No subjects yet"
                description="Add the subjects your school teaches before assigning staff to them."
              />
            }
          />
        </div>
      )}

      {tab === "staffing" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-fg-subtle">
              This is the permission model: a teacher can only mark registers and enter marks for
              the classes listed here.
            </p>
            {teachers.length > 0 && subjects.length > 0 && sections.length > 0 && (
              <AssignTeacherButton
                teachers={teacherOptions}
                subjects={subjectOptions}
                sections={sectionOptions}
              />
            )}
          </div>

          <DataTable
            rows={assignments}
            getRowKey={(row) => row.id}
            caption="Teaching assignments"
            columns={[
              { key: "teacher", header: "Teacher", cell: (row) => row.teacher.name },
              { key: "subject", header: "Subject", cell: (row) => row.subject.name },
              {
                key: "section",
                header: "Class",
                cell: (row) => `${row.section.class.name} — ${row.section.name}`,
              },
              {
                key: "remove",
                header: "",
                align: "right",
                cell: (row) => (
                  <RemoveAssignmentButton
                    assignmentId={row.id}
                    teacherName={row.teacher.name}
                    subjectName={row.subject.name}
                    sectionLabel={`${row.section.class.name} — ${row.section.name}`}
                  />
                ),
              },
            ]}
            empty={
              <EmptyState
                icon={UserSquare}
                title="No teaching assignments"
                description="Assign teachers to subjects and classes so they can take registers and enter marks."
              />
            }
          />
        </div>
      )}
    </div>
  );
}
