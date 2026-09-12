#!/usr/bin/env tsx
/**
 * Verifies that each role sees only the records it is entitled to.
 *
 * `smoke-check.ts` answers "can this role open this page". This answers the
 * harder and more consequential question: given that they can open it, is
 * the *data* on it correctly scoped. A teacher reaching /students is
 * expected; a teacher seeing another class's children on it is the failure
 * that matters, and no status code would reveal it.
 *
 * Run against a dev server with demo data:
 *   npm run rbac
 */
import { PrismaClient } from "@prisma/client";
import { listStudents } from "../lib/queries/students";
import { resolveVisibleSectionIds } from "../lib/queries/academics";
import { resolveVisibleStudentIds } from "../lib/auth/rbac";
import { assertCanViewStudent, assertCanMarkAttendance } from "../lib/auth/rbac";
import { listInvoices } from "../lib/queries/fees";
import { listAssignments } from "../lib/queries/assignments";
import { listExams } from "../lib/queries/exams";
import type { SessionInfo } from "../lib/auth/current-user";

const prisma = new PrismaClient();

let failures = 0;
function check(label: string, passed: boolean, detail = "") {
  console.log(`  ${passed ? "✓" : "✗"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!passed) failures++;
}

/** True when the promise rejected — i.e. access was refused. */
async function refused(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

function session(userId: string, role: SessionInfo["role"]): SessionInfo {
  return { userId, role, sessionId: "rbac-check" };
}

async function main() {
  const principal = await prisma.user.findFirstOrThrow({ where: { role: "PRINCIPAL" } });
  const principalSession = session(principal.id, "PRINCIPAL");

  // ------------------------------------------------------------------
  // Teacher scoping
  // ------------------------------------------------------------------
  console.log("\nTEACHER — sees only the classes they are assigned to");

  const teacher = await prisma.user.findFirstOrThrow({
    where: { role: "TEACHER", status: "ACTIVE", teacherAssignments: { some: {} } },
    orderBy: { createdAt: "asc" },
  });
  const teacherSession = session(teacher.id, "TEACHER");

  const taughtSections = await resolveVisibleSectionIds(teacherSession);
  const taught = taughtSections === "ALL" ? [] : taughtSections;
  check("teacher's section scope is not ALL", taughtSections !== "ALL", `(${taught.length} sections)`);

  const teacherStudents = await listStudents({ session: teacherSession, page: 1 });
  const allStudents = await listStudents({ session: principalSession, page: 1 });
  check(
    "teacher's student list is narrower than the principal's",
    teacherStudents.total < allStudents.total,
    `(${teacherStudents.total} vs ${allStudents.total})`
  );

  // Every student the teacher can list must be enrolled in a taught section.
  const listedIds = teacherStudents.rows.map((row) => row.id);
  const enrolments = await prisma.enrollment.findMany({
    where: { studentId: { in: listedIds } },
    select: { studentId: true, sectionId: true },
  });
  const outsideScope = enrolments.filter((e) => !taught.includes(e.sectionId));
  check("every listed student is in a section they teach", outsideScope.length === 0,
    outsideScope.length ? `(${outsideScope.length} outside)` : "");

  /*
   * A genuinely foreign section: neither taught by them nor one they are
   * class teacher of. Excluding only the taught list was wrong — it picked
   * the teacher's own form class, which they are legitimately entitled to.
   */
  const classTeacherSections = (
    await prisma.section.findMany({ where: { classTeacherId: teacher.id }, select: { id: true } })
  ).map((section) => section.id);
  const ownSections = [...new Set([...taught, ...classTeacherSections])];

  check(
    "class-teacher sections are included in the visible scope",
    classTeacherSections.every((id) => taught.includes(id)),
    `(${classTeacherSections.length} as class teacher)`
  );

  const foreignEnrolment = await prisma.enrollment.findFirst({
    where: { sectionId: { notIn: ownSections } },
    select: { studentId: true, sectionId: true },
  });
  if (foreignEnrolment) {
    check(
      "opening a student from another class is refused",
      await refused(() => assertCanViewStudent(teacherSession, foreignEnrolment.studentId))
    );
    check(
      "marking another class's register is refused",
      await refused(() => assertCanMarkAttendance(teacherSession, foreignEnrolment.sectionId))
    );
  }

  // Their own students and registers must still work.
  const ownEnrolment = await prisma.enrollment.findFirst({
    where: { sectionId: { in: taught } },
    select: { studentId: true, sectionId: true },
  });
  if (ownEnrolment) {
    check(
      "opening a student they teach is allowed",
      !(await refused(() => assertCanViewStudent(teacherSession, ownEnrolment.studentId)))
    );
    check(
      "marking their own register is allowed",
      !(await refused(() => assertCanMarkAttendance(teacherSession, ownEnrolment.sectionId)))
    );
  }

  // Filtering to a section they don't teach must return nothing, not data.
  if (foreignEnrolment) {
    const forced = await listStudents({ session: teacherSession, sectionId: foreignEnrolment.sectionId });
    check("forcing another class's id into the filter returns nothing", forced.total === 0);
  }

  // Assignments and exams follow the same scope.
  const teacherAssignments = await listAssignments({ session: teacherSession });
  const assignmentSections = new Set(
    (
      await prisma.assignment.findMany({
        where: { id: { in: teacherAssignments.rows.map((r) => r.id) } },
        select: { sectionId: true },
      })
    ).map((a) => a.sectionId)
  );
  check(
    "assignments are limited to taught sections",
    [...assignmentSections].every((id) => taught.includes(id))
  );

  const teacherExams = await listExams({ session: teacherSession });
  const examSections = new Set(
    (
      await prisma.exam.findMany({
        where: { id: { in: teacherExams.rows.map((r) => r.id) } },
        select: { sectionId: true },
      })
    ).map((e) => e.sectionId)
  );
  check("exams are limited to taught sections", [...examSections].every((id) => taught.includes(id)));

  // ------------------------------------------------------------------
  // Guardian scoping
  // ------------------------------------------------------------------
  console.log("\nPARENT — sees only their own children");

  const link = await prisma.parentStudentLink.findFirstOrThrow({ select: { parentId: true, studentId: true } });
  const parentSession = session(link.parentId, "PARENT");

  const ownChildren = await resolveVisibleStudentIds(parentSession);
  check("guardian's student scope is a fixed list", ownChildren !== "ALL",
    ownChildren === "ALL" ? "" : `(${ownChildren.length} children)`);

  check(
    "opening their own child is allowed",
    !(await refused(() => assertCanViewStudent(parentSession, link.studentId)))
  );

  const otherChild = await prisma.studentProfile.findFirst({
    where: { id: { notIn: ownChildren === "ALL" ? [] : ownChildren } },
    select: { id: true },
  });
  if (otherChild) {
    check(
      "opening another family's child is refused",
      await refused(() => assertCanViewStudent(parentSession, otherChild.id))
    );
  }

  const parentInvoices = await listInvoices({ session: parentSession });
  const invoiceStudentIds = new Set(parentInvoices.rows.map((row) => row.studentId));
  const ownSet = new Set(ownChildren === "ALL" ? [] : ownChildren);
  check(
    "fee invoices are limited to their own children",
    [...invoiceStudentIds].every((id) => ownSet.has(id)),
    `(${parentInvoices.total} invoices)`
  );

  // ------------------------------------------------------------------
  // Student scoping
  // ------------------------------------------------------------------
  console.log("\nSTUDENT — sees only their own record");

  const studentProfile = await prisma.studentProfile.findFirstOrThrow({
    select: { id: true, userId: true },
  });
  const studentSession = session(studentProfile.userId, "STUDENT");

  const visibleToStudent = await resolveVisibleStudentIds(studentSession);
  check(
    "student's scope is exactly themselves",
    visibleToStudent !== "ALL" && visibleToStudent.length === 1 && visibleToStudent[0] === studentProfile.id
  );

  const anotherStudent = await prisma.studentProfile.findFirst({
    where: { id: { not: studentProfile.id } },
    select: { id: true },
  });
  if (anotherStudent) {
    check(
      "opening another student is refused",
      await refused(() => assertCanViewStudent(studentSession, anotherStudent.id))
    );
  }

  const studentInvoices = await listInvoices({ session: studentSession });
  check(
    "fee invoices are limited to their own",
    studentInvoices.rows.every((row) => row.studentId === studentProfile.id),
    `(${studentInvoices.total} invoices)`
  );

  // ------------------------------------------------------------------
  // Principal
  // ------------------------------------------------------------------
  console.log("\nPRINCIPAL — sees everything");

  const scope = await resolveVisibleSectionIds(principalSession);
  check("principal's section scope is ALL", scope === "ALL");
  check(
    "principal's student scope is ALL",
    (await resolveVisibleStudentIds(principalSession)) === "ALL"
  );

  console.log(`\n${failures === 0 ? "All scoping checks passed." : `${failures} FAILED`}`);
  await prisma.$disconnect();
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
