import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { getSectionOptions, getTeacherSectionOptions } from "@/lib/queries/academics";
import {
  getChildrenForParent,
  getSectionTimetable,
  getStudentSection,
  getTeacherTimetable,
} from "@/lib/queries/timetable";
import { readParam, type RawSearchParams } from "@/lib/search-params";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/filters/FilterBar";
import { TimetableGrid, currentDayOfWeek, type TimetableEntry } from "@/components/timetable/TimetableGrid";

export const metadata: Metadata = { title: "Timetable" };

/**
 * One route, four genuinely different questions:
 *   principal — "what is any class doing this week?"
 *   teacher   — "where am I meant to be?"
 *   student   — "what do I have today?"
 *   guardian  — "what does my child have?"
 *
 * They share a route because they share an answer shape, not because the
 * data behind them is the same.
 */
export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const today = currentDayOfWeek();

  if (session.role === "TEACHER") {
    const entries = await getTeacherTimetable(session.userId);
    return (
      <Layout title="My timetable" description="Every period you teach this week.">
        <TimetableGrid entries={entries} highlightDay={today} />
      </Layout>
    );
  }

  if (session.role === "STUDENT") {
    const enrollment = await getStudentSection(session.userId);
    if (!enrollment) return <NotEnrolled />;

    const entries = await getSectionTimetable(enrollment.sectionId);
    return (
      <Layout title="My timetable" description={enrollment.label}>
        <TimetableGrid entries={entries} highlightDay={today} />
      </Layout>
    );
  }

  if (session.role === "PARENT") {
    const children = await getChildrenForParent(session.userId);
    const enrolled = children.filter((child) => child.sectionId);

    if (enrolled.length === 0) return <NotEnrolled />;

    // Default to the first child; the picker only lists this guardian's own
    // children, so there's no id here they aren't entitled to.
    const requested = readParam(params, "child");
    const child = enrolled.find((candidate) => candidate.id === requested) ?? enrolled[0];
    const entries = await getSectionTimetable(child.sectionId!);

    return (
      <Layout title="Timetable" description={`${child.name} · ${child.sectionLabel}`}>
        {enrolled.length > 1 && (
          <FilterBar
            filters={[
              {
                name: "child",
                label: "Child",
                value: child.id,
                placeholder: "Select a child",
                options: enrolled.map((candidate) => ({ value: candidate.id, label: candidate.name })),
              },
            ]}
          />
        )}
        <TimetableGrid entries={entries} highlightDay={today} />
      </Layout>
    );
  }

  // Principal: browse any section's timetable.
  const sections = session.role === "PRINCIPAL" ? await getSectionOptions() : await getTeacherSectionOptions(session.userId);

  if (sections.length === 0) {
    return (
      <Layout title="Timetable">
        <EmptyState
          icon={CalendarDays}
          title="No classes yet"
          description="Set up classes and sections for the current academic year to build a timetable."
        />
      </Layout>
    );
  }

  const requestedSection = readParam(params, "section");
  const section = sections.find((option) => option.id === requestedSection) ?? sections[0];
  const entries: TimetableEntry[] = await getSectionTimetable(section.id);

  return (
    <Layout title="Timetable" description={section.label}>
      <FilterBar
        filters={[
          {
            name: "section",
            label: "Class",
            value: section.id,
            placeholder: "Select a class",
            options: sections.map((option) => ({ value: option.id, label: option.label })),
          },
        ]}
      />
      <TimetableGrid entries={entries} highlightDay={today} />
    </Layout>
  );
}

function Layout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      {children}
    </div>
  );
}

function NotEnrolled() {
  return (
    <Layout title="Timetable">
      <EmptyState
        icon={CalendarDays}
        title="Not enrolled yet"
        description="A timetable will appear here once enrolment for the current academic year is complete."
      />
    </Layout>
  );
}
