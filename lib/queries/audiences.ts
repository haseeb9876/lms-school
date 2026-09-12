import type { AnnouncementAudience, NotificationType, Role } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Who an announcement reaches, and who can see it afterwards.
 *
 * Two separate questions with one answer each, kept together because they
 * must agree: `resolveRecipients` decides who is *notified* when it is
 * published, and `audiencesVisibleTo` decides whose announcement list it
 * appears in later. If those drifted apart, someone would get a
 * notification for a notice they then couldn't open.
 */

export interface AudienceOption {
  value: AnnouncementAudience;
  label: string;
  description: string;
  /** Requires a class to be chosen alongside it. */
  needsSection: boolean;
}

/** Everything a principal may address. */
export const PRINCIPAL_AUDIENCES: AudienceOption[] = [
  {
    value: "ALL",
    label: "Everyone",
    description: "Staff, students and guardians.",
    needsSection: false,
  },
  {
    value: "STUDENTS_AND_TEACHERS",
    label: "Students and teachers",
    description: "Everyone in the school day, but not guardians.",
    needsSection: false,
  },
  {
    value: "TEACHERS",
    label: "All teachers",
    description: "Teaching staff only.",
    needsSection: false,
  },
  {
    value: "STUDENTS",
    label: "All students",
    description: "Every enrolled student.",
    needsSection: false,
  },
  {
    value: "PARENTS",
    label: "All guardians",
    description: "Every linked parent or guardian.",
    needsSection: false,
  },
  {
    value: "SECTION",
    label: "One class — students",
    description: "Just the students in that class.",
    needsSection: true,
  },
  {
    value: "SECTION_WITH_GUARDIANS",
    label: "One class — students and guardians",
    description: "For a datesheet or a holiday, which parents need too.",
    needsSection: true,
  },
  {
    value: "SECTION_TEACHERS",
    label: "One class — its teachers",
    description: "The teachers who take that class.",
    needsSection: true,
  },
];

/**
 * A teacher may only address a class they teach — never the whole school and
 * never other staff. Without this a single teacher account could notify
 * every guardian in the school.
 */
export const TEACHER_AUDIENCES: AudienceOption[] = PRINCIPAL_AUDIENCES.filter((audience) =>
  ["SECTION", "SECTION_WITH_GUARDIANS"].includes(audience.value)
);

export function audienceOptionsFor(role: Role): AudienceOption[] {
  return role === "PRINCIPAL" ? PRINCIPAL_AUDIENCES : TEACHER_AUDIENCES;
}

export function audienceNeedsSection(audience: AnnouncementAudience): boolean {
  return PRINCIPAL_AUDIENCES.find((option) => option.value === audience)?.needsSection ?? false;
}

/** Short label used on the announcement card. */
export function audienceLabel(audience: AnnouncementAudience): string {
  return PRINCIPAL_AUDIENCES.find((option) => option.value === audience)?.label ?? audience;
}

/**
 * The user ids that should be notified.
 *
 * Resolved from the audience rather than stored, so a class that gains a
 * student tomorrow simply has one more recipient next time — no list to
 * keep in step.
 */
export async function resolveRecipients(
  audience: AnnouncementAudience,
  sectionId?: string | null
): Promise<string[]> {
  const byRole = async (roles: Role[]) => {
    const users = await prisma.user.findMany({
      where: { role: { in: roles }, status: "ACTIVE" },
      select: { id: true },
    });
    return users.map((user) => user.id);
  };

  const sectionStudents = async () => {
    if (!sectionId) return [];
    const enrolments = await prisma.enrollment.findMany({
      where: { sectionId, status: "ACTIVE" },
      select: { student: { select: { userId: true } } },
    });
    return enrolments.map((enrolment) => enrolment.student.userId);
  };

  const sectionGuardians = async () => {
    if (!sectionId) return [];
    const links = await prisma.parentStudentLink.findMany({
      where: { student: { enrollments: { some: { sectionId, status: "ACTIVE" } } } },
      select: { parentId: true },
    });
    // Siblings in the same class share a guardian — notify them once.
    return [...new Set(links.map((link) => link.parentId))];
  };

  const sectionTeachers = async () => {
    if (!sectionId) return [];
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        classTeacherId: true,
        teacherAssignments: { select: { teacherId: true } },
      },
    });
    if (!section) return [];
    const ids = section.teacherAssignments.map((assignment) => assignment.teacherId);
    // The class teacher counts even if they take no subject in it.
    if (section.classTeacherId) ids.push(section.classTeacherId);
    return [...new Set(ids)];
  };

  switch (audience) {
    case "ALL":
      return byRole(["PRINCIPAL", "TEACHER", "STUDENT", "PARENT"]);
    case "STUDENTS_AND_TEACHERS":
      return byRole(["TEACHER", "STUDENT"]);
    case "TEACHERS":
      return byRole(["TEACHER"]);
    case "STUDENTS":
      return byRole(["STUDENT"]);
    case "PARENTS":
      return byRole(["PARENT"]);
    case "PRINCIPAL":
      return byRole(["PRINCIPAL"]);
    case "SECTION":
      return sectionStudents();
    case "SECTION_WITH_GUARDIANS":
      return [...new Set([...(await sectionStudents()), ...(await sectionGuardians())])];
    case "SECTION_TEACHERS":
      return sectionTeachers();
    default:
      return [];
  }
}

/**
 * The audiences whose announcements a role should see listed.
 *
 * Section-targeted notices are filtered further by the caller, which knows
 * *which* sections that person belongs to — this only narrows by kind.
 */
export function audiencesVisibleTo(role: Role): AnnouncementAudience[] {
  switch (role) {
    case "PRINCIPAL":
      // Writes and moderates them, so sees every kind.
      return [
        "ALL",
        "PRINCIPAL",
        "TEACHERS",
        "STUDENTS",
        "PARENTS",
        "SECTION",
        "STUDENTS_AND_TEACHERS",
        "SECTION_WITH_GUARDIANS",
        "SECTION_TEACHERS",
      ];
    case "TEACHER":
      return ["ALL", "STUDENTS_AND_TEACHERS", "TEACHERS", "SECTION_TEACHERS"];
    case "STUDENT":
      return ["ALL", "STUDENTS_AND_TEACHERS", "STUDENTS", "SECTION", "SECTION_WITH_GUARDIANS"];
    case "PARENT":
      return ["ALL", "PARENTS", "SECTION_WITH_GUARDIANS"];
  }
}

/** Which notification type an announcement produces. */
export const ANNOUNCEMENT_NOTIFICATION: NotificationType = "ANNOUNCEMENT";
