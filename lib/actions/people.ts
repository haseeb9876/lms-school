"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/crypto/passwords";
import { generateTempPassword } from "@/lib/crypto/temp-password";
import { blindIndex, encryptField } from "@/lib/crypto/encryption";
import { normalizePhone } from "@/lib/crypto/identifiers";
import { getCurrentAcademicYear } from "@/lib/queries/academics";
import { createStudentSchema, createTeacherSchema, setUserStatusSchema } from "@/lib/schemas/people";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

/**
 * Next admission number for the current year, e.g. CGS-2026-0042.
 *
 * Derived from the highest existing number rather than a row count, so
 * deleting a withdrawn student can't cause the next admission to reuse a
 * number that already appears on a printed record.
 */
async function nextAdmissionNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `CGS-${year}-`;

  const latest = await prisma.studentProfile.findFirst({
    where: { admissionNumber: { startsWith: prefix } },
    orderBy: { admissionNumber: "desc" },
    select: { admissionNumber: true },
  });

  const lastSequence = latest ? Number.parseInt(latest.admissionNumber.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export const createStudent = withAction(
  { roles: ["PRINCIPAL"], input: createStudentSchema },
  async (input, ctx) => {
    const year = await getCurrentAcademicYear();
    if (!year) {
      return actionError("Set up an academic year before enrolling students.", {
        code: "NO_ACADEMIC_YEAR",
      });
    }

    const section = await prisma.section.findFirst({
      where: { id: input.sectionId, academicYearId: year.id },
      select: { id: true },
    });
    if (!section) {
      return actionError("That class isn't part of the current academic year.", {
        code: "SECTION_NOT_FOUND",
        fieldErrors: { sectionId: "Choose a class from the current year." },
      });
    }

    /*
     * CNIC uniqueness is checked up front so the principal gets a message
     * naming the field, rather than a raw unique-constraint failure. The
     * database constraint is still the thing that guarantees it — this is
     * for the error message, not for correctness.
     */
    const studentCnicHash = blindIndex(input.cnic);
    const guardianCnicHash = blindIndex(input.guardianCnic);

    if (studentCnicHash === guardianCnicHash) {
      return actionError("The student and guardian can't share a CNIC.", {
        code: "DUPLICATE_CNIC",
        fieldErrors: { guardianCnic: "This is the same as the student's CNIC." },
      });
    }

    const existing = await prisma.user.findMany({
      where: { cnicHash: { in: [studentCnicHash, guardianCnicHash] } },
      select: { cnicHash: true, name: true, role: true },
    });

    const studentClash = existing.find((user) => user.cnicHash === studentCnicHash);
    if (studentClash) {
      return actionError(`That CNIC already belongs to ${studentClash.name}.`, {
        code: "DUPLICATE_CNIC",
        fieldErrors: { cnic: "An account with this CNIC already exists." },
      });
    }

    // A guardian who already has an account is reused rather than duplicated
    // — siblings at the same school must share one guardian login, or the
    // parent ends up with a separate account per child.
    const guardianClash = existing.find((user) => user.cnicHash === guardianCnicHash);
    if (guardianClash && guardianClash.role !== "PARENT") {
      return actionError(`That guardian CNIC already belongs to ${guardianClash.name}.`, {
        code: "DUPLICATE_CNIC",
        fieldErrors: { guardianCnic: "This CNIC is registered to a non-guardian account." },
      });
    }

    const studentPassword = generateTempPassword();
    const studentPasswordHash = await hashPassword(studentPassword);
    const admissionNumber = await nextAdmissionNumber();

    let guardianPassword: string | null = null;
    let guardianUserId: string;

    const existingGuardian = guardianClash
      ? await prisma.user.findUnique({ where: { cnicHash: guardianCnicHash }, select: { id: true } })
      : null;

    if (existingGuardian) {
      guardianUserId = existingGuardian.id;
    } else {
      guardianPassword = generateTempPassword();
      const guardian = await prisma.user.create({
        data: {
          cnic: encryptField(input.guardianCnic),
          cnicHash: guardianCnicHash,
          name: input.guardianName,
          phone: input.guardianPhone ? normalizePhone(input.guardianPhone) : null,
          phoneHash: input.guardianPhone ? blindIndex(normalizePhone(input.guardianPhone)) : null,
          role: "PARENT",
          passwordHash: await hashPassword(guardianPassword),
          mustChangePassword: true,
        },
        select: { id: true },
      });
      guardianUserId = guardian.id;
    }

    // The student, their profile, their enrolment and the guardian link are
    // one unit — a student enrolled with no section, or with no guardian
    // able to see them, is not a usable record.
    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          cnic: encryptField(input.cnic),
          cnicHash: studentCnicHash,
          name: input.name,
          email: input.email || null,
          role: "STUDENT",
          passwordHash: studentPasswordHash,
          mustChangePassword: true,
          studentProfile: {
            create: {
              admissionNumber,
              rollNumber: input.rollNumber || null,
              dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
              gender: input.gender || null,
              address: input.address || null,
            },
          },
        },
        select: { id: true, studentProfile: { select: { id: true } } },
      });

      const profileId = user.studentProfile!.id;

      await tx.enrollment.create({
        data: { studentId: profileId, sectionId: input.sectionId, academicYearId: year.id },
      });

      await tx.parentStudentLink.create({
        data: {
          parentId: guardianUserId,
          studentId: profileId,
          relationship: input.guardianRelationship,
          isPrimary: true,
        },
      });

      return { userId: user.id, profileId };
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_CREATED",
      targetType: "StudentProfile",
      targetId: student.profileId,
      // Never the CNIC or the generated password.
      metadata: { admissionNumber, sectionId: input.sectionId, guardianLinked: true },
    });

    revalidatePath("/students");

    return actionOk(
      {
        studentId: student.profileId,
        admissionNumber,
        credentials: {
          student: { cnic: input.cnic, password: studentPassword },
          // Null when an existing guardian account was reused — their
          // password is unchanged and must not be reset behind their back.
          guardian: guardianPassword
            ? { cnic: input.guardianCnic, password: guardianPassword }
            : null,
        },
      },
      `${input.name} enrolled as ${admissionNumber}.`
    );
  }
);

export const createTeacher = withAction(
  { roles: ["PRINCIPAL"], input: createTeacherSchema },
  async (input, ctx) => {
    const cnicHash = blindIndex(input.cnic);

    const existing = await prisma.user.findUnique({
      where: { cnicHash },
      select: { name: true },
    });
    if (existing) {
      return actionError(`That CNIC already belongs to ${existing.name}.`, {
        code: "DUPLICATE_CNIC",
        fieldErrors: { cnic: "An account with this CNIC already exists." },
      });
    }

    const duplicateEmployeeId = await prisma.teacherProfile.findUnique({
      where: { employeeId: input.employeeId },
      select: { id: true },
    });
    if (duplicateEmployeeId) {
      return actionError("That employee ID is already in use.", {
        code: "DUPLICATE_EMPLOYEE_ID",
        fieldErrors: { employeeId: "Already in use." },
      });
    }

    const password = generateTempPassword();

    const teacher = await prisma.user.create({
      data: {
        cnic: encryptField(input.cnic),
        cnicHash,
        name: input.name,
        email: input.email || null,
        phone: input.phone ? normalizePhone(input.phone) : null,
        phoneHash: input.phone ? blindIndex(normalizePhone(input.phone)) : null,
        role: "TEACHER",
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        teacherProfile: {
          create: {
            employeeId: input.employeeId,
            qualification: input.qualification || null,
          },
        },
      },
      select: { id: true },
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_CREATED",
      targetType: "User",
      targetId: teacher.id,
      metadata: { role: "TEACHER", employeeId: input.employeeId },
    });

    revalidatePath("/teachers");

    return actionOk(
      { teacherId: teacher.id, credentials: { cnic: input.cnic, password } },
      `${input.name} added to staff.`
    );
  }
);

export const setUserStatus = withAction(
  { roles: ["PRINCIPAL"], input: setUserStatusSchema },
  async (input, ctx) => {
    if (input.userId === ctx.user.id) {
      return actionError("You can't suspend your own account.", { code: "SELF_SUSPEND" });
    }

    const user = await prisma.user.update({
      where: { id: input.userId },
      data: { status: input.status },
      select: { id: true, name: true, role: true },
    });

    /*
     * Suspension has to end the session, not just block the next sign-in.
     * An access token stays valid until it expires, so without this the
     * suspended account keeps working for the rest of its token's life.
     */
    if (input.status === "SUSPENDED") {
      await prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await logAudit({
      actorId: ctx.user.id,
      action: input.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_UPDATED",
      targetType: "User",
      targetId: user.id,
      metadata: { status: input.status, role: user.role },
    });

    revalidatePath("/students");
    revalidatePath("/teachers");
    revalidatePath("/guardians");

    return actionOk(
      undefined,
      input.status === "SUSPENDED" ? `${user.name} suspended.` : `${user.name} reactivated.`
    );
  }
);
