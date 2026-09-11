import type { AnnouncementAudience, Role } from "@prisma/client";
import { prisma } from "@/lib/db";

export const ANNOUNCEMENTS_PAGE_SIZE = 20;

/**
 * The audiences a given role should be shown.
 *
 * A teacher sees staff notices and school-wide ones, but not the "your fee
 * is due" message written for guardians. Filtering in the query rather than
 * hiding rows in the UI keeps content the reader shouldn't see off the wire
 * entirely.
 */
function audiencesForRole(role: Role): AnnouncementAudience[] {
  const shared: AnnouncementAudience[] = ["ALL"];
  switch (role) {
    case "PRINCIPAL":
      // The principal writes and moderates them, so sees every audience.
      return ["ALL", "PRINCIPAL", "TEACHERS", "STUDENTS", "PARENTS", "SECTION"];
    case "TEACHER":
      return [...shared, "TEACHERS"];
    case "STUDENT":
      return [...shared, "STUDENTS"];
    case "PARENT":
      return [...shared, "PARENTS"];
  }
}

export async function listAnnouncements(params: { role: Role; page?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const now = new Date();

  const where = {
    audience: { in: audiencesForRole(params.role) },
    // An expired notice is no longer news; the column exists so time-limited
    // notices drop off on their own rather than needing to be deleted.
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };

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
        publishedAt: true,
        expiresAt: true,
        author: { select: { name: true, role: true } },
      },
    }),
  ]);

  return { announcements, total, page, pageSize: ANNOUNCEMENTS_PAGE_SIZE };
}

/** The few most recent notices, for the dashboard panel. */
export async function getRecentAnnouncements(role: Role, take = 3) {
  const now = new Date();
  return prisma.announcement.findMany({
    where: {
      audience: { in: audiencesForRole(role) },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
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

/** Every user who should receive a notification for a given audience. */
export async function resolveAudienceUserIds(
  audience: AnnouncementAudience,
  sectionId?: string | null
): Promise<string[]> {
  if (audience === "SECTION" && sectionId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId, status: "ACTIVE" },
      select: { student: { select: { userId: true } } },
    });
    return enrollments.map((enrollment) => enrollment.student.userId);
  }

  const roleFilter: Partial<Record<AnnouncementAudience, Role[]>> = {
    ALL: ["PRINCIPAL", "TEACHER", "STUDENT", "PARENT"],
    PRINCIPAL: ["PRINCIPAL"],
    TEACHERS: ["TEACHER"],
    STUDENTS: ["STUDENT"],
    PARENTS: ["PARENT"],
  };

  const roles = roleFilter[audience];
  if (!roles) return [];

  const users = await prisma.user.findMany({
    where: { role: { in: roles }, status: "ACTIVE" },
    select: { id: true },
  });
  return users.map((user) => user.id);
}
