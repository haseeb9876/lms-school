import type { AnnouncementAudience, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audiencesVisibleTo } from "./audiences";
import { getTeacherSectionOptions } from "./academics";

export const DATESHEET_PAGE_SIZE = 12;

export interface DatesheetSummary {
  id: string;
  title: string;
  termName: string | null;
  yearName: string;
  audience: AnnouncementAudience;
  sectionLabel: string | null;
  startsOn: Date | null;
  notes: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: Date | null;
  pageCount: number;
  entryCount: number;
  /** The newest published datesheet this viewer can see. */
  isLatest: boolean;
  /** Examinations that have not started yet. */
  isUpcoming: boolean;
}

/**
 * The sections a viewer belongs to, for narrowing class-targeted datesheets.
 *
 * A student is in their own class; a guardian is in every class their
 * children are in; a teacher is in every class they teach or are class
 * teacher of. Resolved live rather than stored, so a transfer takes effect
 * the moment the enrolment changes.
 */
export async function sectionsForViewer(userId: string, role: Role): Promise<string[]> {
  if (role === "STUDENT") {
    const enrolments = await prisma.enrollment.findMany({
      where: { student: { userId }, status: "ACTIVE" },
      select: { sectionId: true },
    });
    return enrolments.map((enrolment) => enrolment.sectionId);
  }

  if (role === "PARENT") {
    const enrolments = await prisma.enrollment.findMany({
      where: { status: "ACTIVE", student: { parentLinks: { some: { parentId: userId } } } },
      select: { sectionId: true },
    });
    return [...new Set(enrolments.map((enrolment) => enrolment.sectionId))];
  }

  if (role === "TEACHER") {
    const sections = await getTeacherSectionOptions(userId);
    return sections.map((section) => section.id);
  }

  return [];
}

/**
 * The one rule deciding whether a datesheet is visible, used by the list,
 * the detail page and the image route alike.
 *
 * Kept as a single exported clause on purpose. A datesheet is a document
 * with its own URL and its own image URLs, so there are three separate
 * places a viewer could reach one — and three hand-written copies of a
 * visibility rule is how a class-targeted paper ends up readable by the
 * whole school.
 */
export function datesheetVisibilityWhere(params: {
  userId: string;
  role: Role;
  sectionIds: string[];
}): Prisma.ExamDatesheetWhereInput {
  // The principal writes them, so drafts are theirs to see too.
  if (params.role === "PRINCIPAL") return {};

  const audiences = audiencesVisibleTo(params.role);

  return {
    // Nobody but the author sees an unpublished datesheet.
    status: "PUBLISHED",
    OR: [
      // School-wide kinds carry no section at all.
      { audience: { in: audiences }, sectionId: null },
      // Class-targeted kinds only reach members of that class.
      {
        audience: { in: audiences },
        sectionId: { in: params.sectionIds.length > 0 ? params.sectionIds : ["__none__"] },
      },
    ],
  };
}

export async function listDatesheets(params: {
  userId: string;
  role: Role;
  termId?: string | null;
  sectionId?: string | null;
  yearId?: string | null;
  page?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const sectionIds = await sectionsForViewer(params.userId, params.role);

  const where: Prisma.ExamDatesheetWhereInput = {
    AND: [
      datesheetVisibilityWhere({ userId: params.userId, role: params.role, sectionIds }),
      ...(params.termId ? [{ termId: params.termId }] : []),
      ...(params.yearId ? [{ academicYearId: params.yearId }] : []),
      /*
       * Filtering by class includes the school-wide ones. Someone narrowing
       * to "Grade 5 — A" wants that class's examinations, and the whole-school
       * datesheet is one of them — hiding it would be a filter that loses
       * the most important result.
       */
      ...(params.sectionId ? [{ OR: [{ sectionId: params.sectionId }, { sectionId: null }] }] : []),
    ],
  };

  const [total, rows] = await Promise.all([
    prisma.examDatesheet.count({ where }),
    prisma.examDatesheet.findMany({
      where,
      /*
       * Newest first, which is what was asked for and also what people
       * need: the current examinations at the top, last year's below it.
       * Drafts sort by creation since they have no publication date yet.
       */
      orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      skip: (page - 1) * DATESHEET_PAGE_SIZE,
      take: DATESHEET_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        audience: true,
        startsOn: true,
        notes: true,
        status: true,
        publishedAt: true,
        term: { select: { name: true } },
        academicYear: { select: { name: true } },
        section: { select: { name: true, class: { select: { name: true } } } },
        _count: { select: { pages: true, entries: true } },
      },
    }),
  ]);

  const today = startOfToday();

  const summaries: DatesheetSummary[] = rows.map((row, index) => ({
    id: row.id,
    title: row.title,
    termName: row.term?.name ?? null,
    yearName: row.academicYear.name,
    audience: row.audience,
    sectionLabel: row.section ? `${row.section.class.name} — ${row.section.name}` : null,
    startsOn: row.startsOn,
    notes: row.notes,
    status: row.status,
    publishedAt: row.publishedAt,
    pageCount: row._count.pages,
    entryCount: row._count.entries,
    // Only meaningful on the first page of an unfiltered list, which is
    // where the badge is shown.
    isLatest: index === 0 && page === 1 && row.status === "PUBLISHED",
    isUpcoming: row.startsOn !== null && row.startsOn >= today,
  }));

  return { rows: summaries, total, page, pageSize: DATESHEET_PAGE_SIZE };
}

export interface DatesheetDetail extends DatesheetSummary {
  pages: { id: string; caption: string | null }[];
  entries: {
    id: string;
    subjectName: string;
    examDate: Date;
    startTime: string | null;
    endTime: string | null;
    room: string | null;
  }[];
  createdByName: string;
}

/**
 * One datesheet, scoped. Returns null rather than throwing for something
 * this viewer may not see, so the page can 404 — a 403 would confirm that
 * the id is real and that a datesheet exists for a class they aren't in.
 */
export async function getDatesheet(
  id: string,
  viewer: { userId: string; role: Role }
): Promise<DatesheetDetail | null> {
  const sectionIds = await sectionsForViewer(viewer.userId, viewer.role);

  const row = await prisma.examDatesheet.findFirst({
    where: {
      AND: [{ id }, datesheetVisibilityWhere({ ...viewer, sectionIds })],
    },
    select: {
      id: true,
      title: true,
      audience: true,
      startsOn: true,
      notes: true,
      status: true,
      publishedAt: true,
      term: { select: { name: true } },
      academicYear: { select: { name: true } },
      section: { select: { name: true, class: { select: { name: true } } } },
      createdBy: { select: { name: true } },
      pages: { orderBy: { sortOrder: "asc" }, select: { id: true, caption: true } },
      entries: {
        orderBy: [{ examDate: "asc" }, { sortOrder: "asc" }],
        select: {
          id: true,
          subjectName: true,
          examDate: true,
          startTime: true,
          endTime: true,
          room: true,
        },
      },
      _count: { select: { pages: true, entries: true } },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    termName: row.term?.name ?? null,
    yearName: row.academicYear.name,
    audience: row.audience,
    sectionLabel: row.section ? `${row.section.class.name} — ${row.section.name}` : null,
    startsOn: row.startsOn,
    notes: row.notes,
    status: row.status,
    publishedAt: row.publishedAt,
    pageCount: row._count.pages,
    entryCount: row._count.entries,
    isLatest: false,
    isUpcoming: row.startsOn !== null && row.startsOn >= startOfToday(),
    pages: row.pages,
    entries: row.entries,
    createdByName: row.createdBy.name,
  };
}

/**
 * Whether one datesheet image may be streamed to this viewer.
 *
 * Runs the same visibility clause as the list, reached from the page id.
 * Without this the images would be the hole in the whole feature: a
 * class-targeted datesheet whose page URLs anyone could load would make the
 * scoping on the surrounding page decorative.
 */
export async function findVisibleDatesheetPage(
  pageId: string,
  viewer: { userId: string; role: Role }
): Promise<{ storageRef: string } | null> {
  const sectionIds = await sectionsForViewer(viewer.userId, viewer.role);

  return prisma.examDatesheetPage.findFirst({
    where: {
      id: pageId,
      datesheet: datesheetVisibilityWhere({ ...viewer, sectionIds }),
    },
    select: { storageRef: true },
  });
}

/** Midnight today, for "have these examinations started yet". */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * The soonest upcoming datesheet this viewer can see, in one query.
 *
 * A dashboard-only variant of the visibility rule. The general version
 * resolves the viewer's sections first and then filters on the result,
 * which is two serial round trips — and against a database ~250ms away that
 * is half a second added to the most-loaded page in the app, four times per
 * role. Expressing "a class this person belongs to" as a relation filter
 * instead collapses it to one.
 *
 * The rule itself is the same one `datesheetVisibilityWhere` applies; it is
 * restated here in relational form rather than duplicated in spirit, and
 * `scripts/datesheet-check.ts` asserts the two agree.
 */
export function viewerSectionFilter(userId: string, role: Role): Prisma.SectionWhereInput | null {
  switch (role) {
    case "STUDENT":
      return { enrollments: { some: { status: "ACTIVE", student: { userId } } } };
    case "PARENT":
      return {
        enrollments: {
          some: { status: "ACTIVE", student: { parentLinks: { some: { parentId: userId } } } },
        },
      };
    case "TEACHER":
      // Both routes a teacher holds a class by — teaching a subject in it,
      // or being its class teacher.
      return {
        OR: [{ classTeacherId: userId }, { teacherAssignments: { some: { teacherId: userId } } }],
      };
    default:
      return null;
  }
}

export async function getUpcomingDatesheet(
  userId: string,
  role: Role,
  from: Date
): Promise<{ id: string; title: string; startsOn: Date } | null> {
  const audiences = audiencesVisibleTo(role);
  const sectionFilter = viewerSectionFilter(userId, role);

  const scope: Prisma.ExamDatesheetWhereInput =
    role === "PRINCIPAL"
      ? {}
      : {
          audience: { in: audiences },
          OR: [
            { sectionId: null },
            ...(sectionFilter ? [{ section: sectionFilter }] : []),
          ],
        };

  const row = await prisma.examDatesheet.findFirst({
    where: {
      AND: [scope, { status: "PUBLISHED" }, { startsOn: { gte: from } }],
    },
    // Soonest first, not most recently published — what matters is which
    // examinations arrive next.
    orderBy: { startsOn: "asc" },
    select: { id: true, title: true, startsOn: true },
  });

  return row?.startsOn ? { id: row.id, title: row.title, startsOn: row.startsOn } : null;
}
