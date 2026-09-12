import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { getDatesheet } from "@/lib/queries/datesheets";
import { audienceLabel } from "@/lib/queries/audiences";
import { formatDate, formatDateTime, formatTimeOfDay, formatWeekday } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { PrintButton } from "@/components/ui/PrintButton";
import { DatesheetPages } from "@/components/datesheets/DatesheetPages";
import { DatesheetAdminPanel } from "@/components/datesheets/DatesheetAdminPanel";

// Deliberately static: a datesheet title is typed by the principal and
// would otherwise end up in the browser title and any shared link.
export const metadata: Metadata = { title: "Datesheet" };

export default async function DatesheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const datesheet = await getDatesheet(id, session);
  // A datesheet this viewer may not see 404s rather than 403s, so the
  // response doesn't confirm that another class has one.
  if (!datesheet) notFound();

  // Papers are grouped by day, which is how a datesheet is read — "what do
  // I have on Tuesday", never "show me every paper in order".
  const byDay = new Map<string, typeof datesheet.entries>();
  for (const entry of datesheet.entries) {
    const key = entry.examDate.toISOString().slice(0, 10);
    const existing = byDay.get(key);
    if (existing) existing.push(entry);
    else byDay.set(key, [entry]);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Exam Datesheets", href: "/datesheets" }, { label: datesheet.title }]}
        title={datesheet.title}
        description={[datesheet.termName, datesheet.yearName].filter(Boolean).join(" · ")}
        actions={<PrintButton label="Print" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        {datesheet.status === "DRAFT" && <Badge variant="warning">Draft — not published</Badge>}
        {datesheet.isUpcoming && datesheet.status === "PUBLISHED" && <Badge variant="info">Upcoming</Badge>}
        <Badge variant="neutral">{datesheet.sectionLabel ?? audienceLabel(datesheet.audience)}</Badge>
        {datesheet.startsOn && (
          <Badge variant="outline">
            <CalendarDays className="mr-1 h-3 w-3" aria-hidden="true" />
            Begins {formatDate(datesheet.startsOn)}
          </Badge>
        )}
      </div>

      {datesheet.notes && (
        <Alert variant="info" title="Please note">
          <p className="whitespace-pre-wrap">{datesheet.notes}</p>
        </Alert>
      )}

      {datesheet.pages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>The official timetable</CardTitle>
            <p className="mt-1 text-sm text-fg-subtle">Tap a page to open it full size.</p>
          </CardHeader>
          <CardContent>
            <DatesheetPages pages={datesheet.pages} />
          </CardContent>
        </Card>
      )}

      {byDay.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Papers</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-5">
              {[...byDay.entries()].map(([day, entries]) => {
                const date = new Date(`${day}T00:00:00.000Z`);
                return (
                  <li key={day}>
                    <p className="mb-2 flex flex-wrap items-baseline gap-2 border-b border-line pb-1.5">
                      <span className="text-sm font-semibold text-fg">{formatDate(date)}</span>
                      <span className="text-xs text-fg-subtle">{formatWeekday(date)}</span>
                    </p>
                    <ul className="flex flex-col gap-2">
                      {entries.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-surface-sunken px-3 py-2"
                        >
                          <span className="min-w-0 flex-1 font-medium text-fg">
                            {entry.subjectName}
                          </span>
                          {(entry.startTime || entry.endTime) && (
                            <span className="inline-flex items-center gap-1 text-sm tabular-nums text-fg-muted">
                              <Clock className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
                              {entry.startTime ? formatTimeOfDay(entry.startTime) : "—"}
                              {entry.endTime ? ` – ${formatTimeOfDay(entry.endTime)}` : ""}
                            </span>
                          )}
                          {entry.room && (
                            <span className="inline-flex items-center gap-1 text-sm text-fg-muted">
                              <MapPin className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
                              {entry.room}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {datesheet.pages.length === 0 && byDay.size === 0 && (
        <Alert variant="warning" title="Nothing here yet">
          This datesheet has no papers listed and no timetable image.
        </Alert>
      )}

      <p className="text-xs text-fg-subtle">
        Published by {datesheet.createdByName}
        {datesheet.publishedAt ? ` · ${formatDateTime(datesheet.publishedAt)}` : " · not yet published"}
      </p>

      {session.role === "PRINCIPAL" && (
        <DatesheetAdminPanel
          datesheetId={datesheet.id}
          status={datesheet.status}
          pages={datesheet.pages}
          entries={datesheet.entries.map((entry) => ({
            subjectName: entry.subjectName,
            examDate: entry.examDate.toISOString().slice(0, 10),
            startTime: entry.startTime ?? "",
            endTime: entry.endTime ?? "",
            room: entry.room ?? "",
          }))}
          meta={{
            title: datesheet.title,
            audience: datesheet.audience,
            notes: datesheet.notes ?? "",
            startsOn: datesheet.startsOn ? datesheet.startsOn.toISOString().slice(0, 10) : "",
          }}
        />
      )}
    </div>
  );
}
