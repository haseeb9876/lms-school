import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Users } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { resolveVisibleSectionIds } from "@/lib/queries/academics";
import { listClasses } from "@/lib/queries/classes";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";

export const metadata: Metadata = { title: "Classes" };

export default async function ClassesPage() {
  const session = await requireAuth(["PRINCIPAL", "TEACHER"]);
  const visible = await resolveVisibleSectionIds(session);
  const classes = await listClasses(visible);

  if (classes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Classes" />
        <EmptyState
          icon={BookOpen}
          title="No classes yet"
          description={
            session.role === "PRINCIPAL"
              ? "Set up classes and sections for the current academic year to get started."
              : "You aren't assigned to any classes for the current academic year."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Classes"
        description={
          session.role === "PRINCIPAL"
            ? "Every section running in the current academic year."
            : "The classes you teach."
        }
      />

      {/* A card grid rather than a table: each class is an object you open,
          and the fill-level bar is the thing worth scanning across them. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((section) => {
          const fillPercent = section.capacity
            ? (section.studentCount / section.capacity) * 100
            : null;

          return (
            <Link
              key={section.id}
              href={`/classes/${section.id}`}
              className="group flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-5 shadow-soft transition-all hover:border-line-strong hover:shadow-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-fg">{section.className}</p>
                  <p className="text-sm text-fg-subtle">Section {section.sectionName}</p>
                </div>
                <Badge variant="brand">{section.subjectCount} subjects</Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-fg-muted">
                <Users className="h-4 w-4 flex-none text-fg-subtle" aria-hidden="true" />
                <span className="tabular-nums">
                  {section.studentCount}
                  {section.capacity ? ` / ${section.capacity}` : ""} students
                </span>
              </div>

              {fillPercent !== null && (
                <ProgressBar
                  value={fillPercent}
                  // Over capacity is the problem worth flagging, not a full
                  // class — a class at 100% is simply full.
                  tone={fillPercent > 100 ? "danger" : fillPercent > 90 ? "warning" : "brand"}
                  label="Capacity"
                  showValue
                />
              )}

              <p className="mt-auto truncate border-t border-line pt-3 text-xs text-fg-subtle">
                {section.classTeacher ? (
                  <>Class teacher: {section.classTeacher.name}</>
                ) : (
                  "No class teacher assigned"
                )}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
