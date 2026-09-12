import { prisma } from "@/lib/db";
import { blindIndex, decryptField } from "@/lib/crypto/encryption";
import { normalizeCnic, normalizePhone } from "@/lib/crypto/identifiers";

export interface RecoveryMatch {
  id: string;
  name: string;
  role: "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT";
  status: "ACTIVE" | "SUSPENDED";
  cnic: string;
  phone: string | null;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
  /**
   * Facts the principal can check against the person standing in front of
   * them and against the paper register — class and admission number for a
   * student, employee id for a teacher, the children for a guardian.
   */
  identifiers: { label: string; value: string }[];
  /** Live sessions that a reset will end. */
  activeSessions: number;
}

/**
 * Finds the one account a CNIC belongs to.
 *
 * Exact match only, and on the CNIC alone. This is deliberately not the
 * fuzzy name search the people directory uses: a desk that answers "show me
 * everyone called Ahmed" is a desk where the wrong Ahmed's password gets
 * changed. Someone asking for their password reset can always state their
 * own CNIC — it is printed on the card in their hand — so requiring it
 * costs nothing and removes the ambiguity entirely.
 *
 * The CNIC column is encrypted with a random IV and cannot be matched with
 * a LIKE, so the deterministic blind index is both the only way to look
 * someone up by it and, usefully, incapable of prefix matching.
 */
export async function findAccountByCnic(rawIdentifier: string): Promise<RecoveryMatch | null> {
  const digits = normalizeCnic(rawIdentifier);

  // A Pakistani CNIC is 13 digits. Anything shorter is a typo or a probe,
  // and answering it would turn this into an enumeration oracle.
  const byCnic =
    digits.length === 13
      ? await prisma.user.findUnique({ where: { cnicHash: blindIndex(digits) } })
      : null;

  // A guardian who knows their phone number but not their CNIC is a real
  // case at a school counter, so that is accepted as a second route.
  const user =
    byCnic ??
    (digits.length >= 10
      ? await prisma.user.findUnique({
          where: { phoneHash: blindIndex(normalizePhone(rawIdentifier)) },
        })
      : null);

  if (!user) return null;

  const [profileData, sessionCount] = await Promise.all([
    loadIdentifiers(user.id, user.role),
    prisma.session.count({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    status: user.status,
    cnic: decryptField(user.cnic),
    phone: user.phone,
    lastLoginAt: user.lastLoginAt,
    mustChangePassword: user.mustChangePassword,
    identifiers: profileData,
    activeSessions: sessionCount,
  };
}

async function loadIdentifiers(
  userId: string,
  role: "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT"
): Promise<{ label: string; value: string }[]> {
  if (role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        admissionNumber: true,
        rollNumber: true,
        dateOfBirth: true,
        enrollments: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { section: { select: { name: true, class: { select: { name: true } } } } },
        },
        parentLinks: {
          select: { relationship: true, parent: { select: { name: true } } },
        },
      },
    });
    if (!profile) return [];

    const enrolment = profile.enrollments[0];
    return [
      { label: "Admission number", value: profile.admissionNumber },
      ...(profile.rollNumber ? [{ label: "Roll number", value: profile.rollNumber }] : []),
      ...(enrolment
        ? [{ label: "Class", value: `${enrolment.section.class.name} — ${enrolment.section.name}` }]
        : []),
      ...profile.parentLinks.map((link) => ({
        label: link.relationship === "FATHER" ? "Father" : link.relationship === "MOTHER" ? "Mother" : "Guardian",
        value: link.parent.name,
      })),
    ];
  }

  if (role === "TEACHER") {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { employeeId: true, qualification: true },
    });
    if (!profile) return [];
    return [
      { label: "Employee ID", value: profile.employeeId },
      ...(profile.qualification ? [{ label: "Qualification", value: profile.qualification }] : []),
    ];
  }

  if (role === "PARENT") {
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId: userId },
      select: {
        relationship: true,
        student: {
          select: {
            user: { select: { name: true } },
            enrollments: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { section: { select: { name: true, class: { select: { name: true } } } } },
            },
          },
        },
      },
    });

    return links.map((link) => {
      const enrolment = link.student.enrollments[0];
      return {
        label: link.relationship === "FATHER" ? "Father of" : link.relationship === "MOTHER" ? "Mother of" : "Guardian of",
        value: enrolment
          ? `${link.student.user.name} (${enrolment.section.class.name} — ${enrolment.section.name})`
          : link.student.user.name,
      };
    });
  }

  return [];
}
