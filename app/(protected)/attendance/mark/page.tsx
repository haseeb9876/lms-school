import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { assertCanMarkAttendance } from "@/lib/auth/rbac";
import { getSectionOptions, getTeacherSectionOptions } from "@/lib/queries/academics";
import { getSectionRoster } from "@/lib/queries/attendance";
import { readParam, type RawSearchParams } from "@/lib/search-params";
import { formatDate, formatWeekday, todaySchoolDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Alert";
import { DateNavigator } from "@/components/filters/DateNavigator";
import { FilterBar } from "@/components/filters/FilterBar";
import { MarkAttendanceForm } from "@/components/attendance/MarkAttendanceForm";

export const metadata: Metadata = { title: "Take register" };

export default async function MarkAttendancePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth(["PRINCIPAL", "TEACHER"]);
  const params = await searchParams;

  const today = todaySchoolDate();
  const date = readParam(params, "date") ?? today;
  const sectionId = readParam(params, "section");

  const sections =
    session.role === "PRINCIPAL"
      ? await getSectionOptions()
      : await getTeacherSectionOptions(session.userId);

  // Landing here without a class picked is the common case (from the nav
  // rather than from a register row), so default to the first class the
  // teacher has rather than showing an empty chooser.
  if (!sectionId && sections.length > 0) {
    redirect(`/attendance/mark?section=${sections[0].id}&date=${date}`);
  }

  if (sections.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Take register" breadcrumbs={[{ label: "Attendance", href: "/attendance" }]} />
        <EmptyState
          icon={ClipboardList}
          title="No classes assigned"
          description="You aren't assigned to any classes for the current academic year."
        />
      </div>
    );
  }

  const section = sections.find((option) => option.id === sectionId);
  if (!section) {
    // The id isn't in this user's own list of sections — refuse rather than
    // silently falling back, so a mistyped or guessed id is visible.
    await assertCanMarkAttendance(session, sectionId!);
  }

  const sectionLabel = section?.label ?? "Class";
  const dateUtc = new Date(`${date}T00:00:00.000Z`);
  const isFuture = date > today;

  const roster = isFuture ? [] : await getSectionRoster(sectionId!, dateUtc);
  const alreadyMarked = roster.some((entry) => entry.existingStatus !== null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Attendance", href: "/attendance" }, { label: "Take register" }]}
        title={sectionLabel}
        description={`${formatWeekday(dateUtc)}, ${formatDate(dateUtc)}`}
      />

      <FilterBar
        filters={[
          {
            name: "section",
            label: "Class",
            value: sectionId,
            placeholder: "Choose a class",
            options: sections.map((option) => ({ value: option.id, label: option.label })),
          },
        ]}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">Date</span>
          <DateNavigator value={date} max={today} />
        </div>
      </FilterBar>

      {isFuture ? (
        <Alert variant="warning" title="That date hasn't happened yet">
          Attendance can only be recorded for today or an earlier day.
        </Alert>
      ) : (
        <>
          {alreadyMarked && (
            <Alert variant="info" title="Register already taken">
              You&apos;re editing an existing register for this day. Saving will replace what was recorded.
            </Alert>
          )}

          <MarkAttendanceForm
            sectionId={sectionId!}
            sectionLabel={sectionLabel}
            date={date}
            roster={roster}
            alreadyMarked={alreadyMarked}
          />
        </>
      )}
    </div>
  );
}
