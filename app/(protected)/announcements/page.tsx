import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { requireAuth } from "@/lib/auth/current-user";
import { listAnnouncements } from "@/lib/queries/announcements";
import { getSectionOptions, getTeacherSectionOptions } from "@/lib/queries/academics";
import { buildHref, readPage, type RawSearchParams } from "@/lib/search-params";
import { formatDateTime, formatRelativeTime, humanizeEnum } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { NewAnnouncementButton } from "@/components/announcements/NewAnnouncementDialog";
import { DeleteAnnouncementButton } from "@/components/announcements/DeleteAnnouncementButton";

export const metadata: Metadata = { title: "Announcements" };

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: "Everyone",
  PRINCIPAL: "Principal",
  TEACHERS: "Teachers",
  STUDENTS: "Students",
  PARENTS: "Guardians",
  SECTION: "One class",
};

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const page = readPage(params);

  const { announcements, total, pageSize } = await listAnnouncements({ role: session.role, page });

  const canPublish = session.role === "PRINCIPAL" || session.role === "TEACHER";
  const sections = canPublish
    ? session.role === "PRINCIPAL"
      ? await getSectionOptions()
      : await getTeacherSectionOptions(session.userId)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Announcements"
        description="Notices from the school, newest first."
        actions={
          canPublish ? (
            <NewAnnouncementButton
              role={session.role}
              sections={sections.map((s) => ({ value: s.id, label: s.label }))}
            />
          ) : undefined
        }
      />

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description={
            canPublish
              ? "Publish an announcement to reach students, guardians or staff."
              : "Notices from the school will appear here."
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {announcements.map((announcement) => (
            <li
              key={announcement.id}
              className="rounded-lg border border-line bg-surface-raised p-5 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-fg">{announcement.title}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                    <Avatar name={announcement.author.name} size="xs" />
                    <span>{announcement.author.name}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={announcement.publishedAt.toISOString()}>
                      {formatRelativeTime(announcement.publishedAt)}
                    </time>
                  </div>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Badge variant="brand">
                    {AUDIENCE_LABELS[announcement.audience] ?? humanizeEnum(announcement.audience)}
                  </Badge>
                  {session.role === "PRINCIPAL" && (
                    <DeleteAnnouncementButton id={announcement.id} title={announcement.title} />
                  )}
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
                {announcement.body}
              </p>

              {announcement.expiresAt && (
                <p className="mt-3 border-t border-line pt-2.5 text-xs text-fg-subtle">
                  Hidden after {formatDateTime(announcement.expiresAt)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        buildHref={(nextPage) => buildHref("/announcements", params, { page: nextPage })}
      />
    </div>
  );
}
