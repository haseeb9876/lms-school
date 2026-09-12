import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audiencesVisibleTo } from "./audiences";

export const ANNOUNCEMENTS_PAGE_SIZE = 20;

/**
 * The sections a person belongs to, for filtering class-targeted notices.
 *
 * A student belongs to the class they're enrolled in; a guardian to every
 * class their children are in; a teacher to every class they take. An
 * announcement aimed at one class must reach exactly those people and
 * nobody else.
 */
async function sectionsForViewer(userId: string, role: Role): Promise<string[]> {
  if (role === "STUDENT") {
    const enrolments = await prisma.enrollment.findMany({
      where: { student: { userId }, status: "ACTIVE" },
      select: { sectionId: true },
    });
    return enrolments.map((enrolment) => enrolment.sectionId);
  }

  if (role === "PARENT") {
    const enrolments = await prisma.enrollment.findMany({
      where: { student: { parentLinks: { some: { parentId: userId } } }, status: "ACTIVE" },
      select: { sectionId: true },
    });
    return [...new Set(enrolments.map((enrolment) => enrolment.sectionId))];
  }

  if (role === "TEACHER") {
    const sections = await prisma.section.findMany({
      where: {
        OR: [{ teacherAssignments: { some: { teacherId: userId } } }, { classTeacherId: userId }],
      },
      select: { id: true },
    });
    return sections.map((section) => section.id);
  }

  return [];
}

/**
 * Builds the visibility filter for one viewer.
 *
 * School-wide notices are matched on audience alone. Class-targeted ones
 * additionally require the viewer to be in that class — without which a
 * notice meant for Grade 1 would appear for the whole school.
 */
async function visibilityWhere(userId: string, role: Role): Promise<Prisma.AnnouncementWhereInput> {
  const now = new Date();
  const audiences = audiencesVisibleTo(role);

  const sectionAudiences = audiences.filter((audience) => audience.startsWith("SECTION"));
  const broadAudiences = audiences.filter((audience) => !audience.startsWith("SECTION"));

  const clauses: Prisma.AnnouncementWhereInput[] = [];

  if (broadAudiences.length > 0) {
    clauses.push({ audience: { in: broadAudiences } });
  }

  if (sectionAudiences.length > 0) {
    if (role === "PRINCIPAL") {
      // The principal sees every class's notices regardless of section.
      clauses.push({ audience: { in: sectionAudiences } });
    } else {
      const sectionIds = await sectionsForViewer(userId, role);
      if (sectionIds.length > 0) {
        clauses.push({ audience: { in: sectionAudiences }, sectionId: { in: sectionIds } });
      }
    }
  }

  return {
    // An expired notice is no longer news; the column exists so time-limited
    // notices drop off on their own rather than needing to be deleted.
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      clauses.length > 0 ? { OR: clauses } : { id: "__none__" },
    ],
  };
}

export async function listAnnouncements(params: {
  userId: string;
  role: Role;
  page?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const where = await visibilityWhere(params.userId, params.role);

  const [total, announcements] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * ANNOUNCEMENTS_PAGE_SIZE,
      take: ANNOUNCEMENTS_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        body: true,
        audience: true,
        sectionId: true,
        publishedAt: true,
        expiresAt: true,
        author: { select: { name: true, role: true } },
      },
    }),
  ]);

  // Section names, for the ones that carry a class — one query rather than
  // a nested relation on every row.
  const sectionIds = [...new Set(announcements.map((a) => a.sectionId).filter(Boolean))] as string[];
  const sections = sectionIds.length
    ? await prisma.section.findMany({
        where: { id: { in: sectionIds } },
        select: { id: true, name: true, class: { select: { name: true } } },
      })
    : [];
  const sectionLabels = new Map(
    sections.map((section) => [section.id, `${section.class.name} — ${section.name}`])
  );

  return {
    announcements: announcements.map((announcement) => ({
      ...announcement,
      sectionLabel: announcement.sectionId ? sectionLabels.get(announcement.sectionId) ?? null : null,
    })),
    total,
    page,
    pageSize: ANNOUNCEMENTS_PAGE_SIZE,
  };
}

/** The few most recent notices, for the dashboard panel. */
export async function getRecentAnnouncements(userId: string, role: Role, take = 3) {
  const where = await visibilityWhere(userId, role);
  return prisma.announcement.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      body: true,
      publishedAt: true,
      author: { select: { name: true } },
    },
  });
}
