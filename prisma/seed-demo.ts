#!/usr/bin/env tsx
/**
 * Builds a complete, realistic demo school: staff, students, guardians,
 * timetables, a term of attendance, graded assignments, exam results, fee
 * invoices and announcements.
 *
 * Why this exists: every screen in this app is a view over related records.
 * A gradebook with no exams, an attendance report with no history and a fee
 * dashboard with no invoices all render as empty boxes, so neither the UI
 * nor the queries behind it can actually be judged. This produces enough
 * connected data for each screen to show its real, populated state.
 *
 * Written as batched `createMany` calls against pre-generated ids rather
 * than nested `create` calls. Against a hosted database each round trip
 * costs tens of milliseconds, and the natural nested-write version issued
 * roughly four thousand of them — enough to run for over fifteen minutes.
 * Generating ids up front lets related rows be built in memory and inserted
 * in a few dozen batches instead.
 *
 * Destructive by design — it clears existing academic data first so repeated
 * runs converge on the same school rather than stacking duplicates. Guarded
 * against running against a production database.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { hashPassword } from "../lib/crypto/passwords";
import { encryptField, blindIndex } from "../lib/crypto/encryption";
import {
  ANNOUNCEMENTS,
  ASSIGNMENT_TITLES,
  FEE_CATEGORIES,
  FEMALE_FIRST_NAMES,
  LAST_NAMES,
  MALE_FIRST_NAMES,
  Rng,
  SUBJECTS,
  gradeForPercentage,
  recentSchoolDays,
  subjectsForGrade,
} from "./demo-data";

const prisma = new PrismaClient();
const rng = new Rng();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "DemoPassword2026!";
/** "Today" for the generated data. Fixed so reseeding is reproducible. */
const TODAY = new Date("2026-09-12T00:00:00.000Z");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;
/**
 * Readable, deterministic primary keys. Prisma's `@default(cuid())` only
 * applies when no id is supplied, so providing our own is what makes
 * batching possible: a child row can reference its parent's id before the
 * parent has been inserted.
 */
function id(prefix: string): string {
  return `seed_${prefix}_${String(++idCounter).padStart(7, "0")}`;
}

let cnicCounter = 1;
function nextCnic(): string {
  // 13 digits, matching the Pakistani CNIC format the login form expects.
  return `35201${String(cnicCounter++).padStart(8, "0")}`;
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** Midnight UTC — attendance.date is a @db.Date column. */
function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * PostgreSQL caps a statement at 65535 bind parameters, so a single
 * createMany of tens of thousands of rows fails outright. Chunking keeps
 * each statement well inside that limit.
 */
async function insertInChunks<TRow>(
  label: string,
  rows: TRow[],
  insert: (batch: TRow[]) => Promise<unknown>,
  chunkSize = 2000
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await insert(rows.slice(i, i + chunkSize));
  }
  console.log(`  ${label}: ${rows.length}`);
}

async function clearAcademicData() {
  // Ordered so children go before parents; the schema's cascades would cover
  // most of this, but being explicit keeps the intent readable.
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.deskTicketMessage.deleteMany(),
    prisma.deskTicket.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.feePayment.deleteMany(),
    prisma.feeInvoice.deleteMany(),
    prisma.feeStructure.deleteMany(),
    prisma.feeCategory.deleteMany(),
    prisma.examResult.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.timetableSlot.deleteMany(),
    prisma.teacherSubjectAssignment.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.parentStudentLink.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.teacherProfile.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.session.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.section.deleteMany(),
    prisma.class.deleteMany(),
    prisma.term.deleteMany(),
    prisma.academicYear.deleteMany(),
    // Everyone except the principal — the principal is the account whoever
    // is running this demo is already signed in as.
    prisma.user.deleteMany({ where: { role: { not: "PRINCIPAL" } } }),
  ]);
}

// ---------------------------------------------------------------------------

async function main() {
  const startedAt = Date.now();

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "yes") {
    throw new Error(
      "Refusing to run the demo seed against a production database. " +
        "Set ALLOW_DEMO_SEED=yes only if you are certain this database is disposable."
    );
  }

  console.log("Clearing existing academic data…");
  await clearAcademicData();

  // A single bcrypt hash reused across every demo account. Hashing ~500
  // passwords at cost 12 individually would add minutes to the seed for no
  // benefit — they all share one well-known demo password anyway.
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // -------------------------------------------------------------------
  // School identity
  // -------------------------------------------------------------------
  await prisma.schoolSettings.upsert({
    where: { id: "school" },
    update: {},
    create: {
      id: "school",
      schoolName: "Crescent Grammar School",
      primaryColor: "#0e6e68",
      address: "12-B Jinnah Road, Gulberg III, Lahore",
      phone: "+92 42 3577 1200",
      email: "office@crescentgrammar.edu.pk",
      website: "https://crescentgrammar.edu.pk",
    },
  });

  // -------------------------------------------------------------------
  // Principal
  // -------------------------------------------------------------------
  let principal = await prisma.user.findFirst({ where: { role: "PRINCIPAL" } });
  if (!principal) {
    const cnic = nextCnic();
    principal = await prisma.user.create({
      data: {
        cnic: encryptField(cnic),
        cnicHash: blindIndex(cnic),
        name: "Dr. Sameena Iqbal",
        email: "principal@crescentgrammar.edu.pk",
        role: "PRINCIPAL",
        passwordHash,
      },
    });
    console.log(`  Principal login CNIC: ${cnic}`);
  }

  // -------------------------------------------------------------------
  // Academic year and terms
  // -------------------------------------------------------------------
  console.log("Seeding academic structure…");

  const yearId = id("year");
  await prisma.academicYear.create({
    data: {
      id: yearId,
      name: "2026-2027",
      startDate: utcDate(2026, 8, 1),
      endDate: utcDate(2027, 5, 31),
      isCurrent: true,
    },
  });

  const termRows: Prisma.TermCreateManyInput[] = [
    { id: id("term"), academicYearId: yearId, name: "First Term", startDate: utcDate(2026, 8, 1), endDate: utcDate(2026, 11, 30) },
    { id: id("term"), academicYearId: yearId, name: "Second Term", startDate: utcDate(2026, 12, 1), endDate: utcDate(2027, 3, 15) },
    { id: id("term"), academicYearId: yearId, name: "Final Term", startDate: utcDate(2027, 3, 16), endDate: utcDate(2027, 5, 31) },
  ];
  await prisma.term.createMany({ data: termRows });
  const firstTermId = termRows[0].id!;

  // -------------------------------------------------------------------
  // Subjects, classes, sections
  // -------------------------------------------------------------------
  const subjectRows = SUBJECTS.map((subject) => ({ id: id("subj"), ...subject }));
  await prisma.subject.createMany({ data: subjectRows });
  const subjectByCode = new Map(subjectRows.map((s) => [s.code, s]));

  const classRows = Array.from({ length: 10 }, (_, i) => ({
    id: id("class"),
    name: `Grade ${i + 1}`,
    sortOrder: i + 1,
  }));
  await prisma.class.createMany({ data: classRows });

  interface SeededSection {
    id: string;
    classId: string;
    name: string;
    grade: number;
    className: string;
    classTeacherId?: string;
  }

  const sections: SeededSection[] = [];
  for (const cls of classRows) {
    // Primary grades run one section; the larger middle/high grades run two.
    const sectionNames = cls.sortOrder <= 5 ? ["A"] : ["A", "B"];
    for (const name of sectionNames) {
      sections.push({
        id: id("sect"),
        classId: cls.id,
        name,
        grade: cls.sortOrder,
        className: cls.name,
      });
    }
  }

  // -------------------------------------------------------------------
  // Teachers
  // -------------------------------------------------------------------
  const TEACHER_COUNT = 18;
  const userRows: Prisma.UserCreateManyInput[] = [];
  const teacherProfileRows: Prisma.TeacherProfileCreateManyInput[] = [];
  const teachers: { id: string; name: string }[] = [];
  let firstTeacherCnic = "";

  for (let i = 0; i < TEACHER_COUNT; i++) {
    const female = i % 2 === 0;
    const first = female
      ? FEMALE_FIRST_NAMES[i % FEMALE_FIRST_NAMES.length]
      : MALE_FIRST_NAMES[i % MALE_FIRST_NAMES.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const cnic = nextCnic();
    if (i === 0) firstTeacherCnic = cnic;

    const userId = id("user");
    const phone = `+9230012${String(10000 + i).slice(0, 5)}`;

    userRows.push({
      id: userId,
      cnic: encryptField(cnic),
      cnicHash: blindIndex(cnic),
      name: `${first} ${last}`,
      email: `teacher${i + 1}@crescentgrammar.edu.pk`,
      phone,
      phoneHash: blindIndex(phone),
      role: "TEACHER",
      passwordHash,
      lastLoginAt: new Date(TODAY.getTime() - rng.int(0, 72) * 3600_000),
    });

    teacherProfileRows.push({
      id: id("tprof"),
      userId,
      employeeId: `EMP-${String(i + 1).padStart(3, "0")}`,
      qualification: rng.pick([
        "M.Sc. Mathematics", "M.A. English", "M.Sc. Physics", "M.A. Urdu",
        "M.Sc. Chemistry", "BS Computer Science", "M.A. Islamic Studies", "M.Sc. Biology",
      ]),
      joiningDate: utcDate(rng.int(2015, 2025), rng.int(1, 12), rng.int(1, 28)),
    });

    teachers.push({ id: userId, name: `${first} ${last}` });
  }

  // One class teacher per section, spread across staff.
  sections.forEach((section, i) => {
    section.classTeacherId = teachers[i % teachers.length].id;
  });

  // -------------------------------------------------------------------
  // Students and guardians
  // -------------------------------------------------------------------
  console.log("Seeding people…");

  interface SeededStudent {
    profileId: string;
    userId: string;
    name: string;
    sectionId: string;
    grade: number;
    /** Stable academic ability, so marks correlate across subjects. */
    ability: number;
    /** Stable attendance reliability, so the register shows real patterns. */
    reliability: number;
  }

  const students: SeededStudent[] = [];
  const studentProfileRows: Prisma.StudentProfileCreateManyInput[] = [];
  const enrollmentRows: Prisma.EnrollmentCreateManyInput[] = [];
  const parentLinkRows: Prisma.ParentStudentLinkCreateManyInput[] = [];
  let admissionCounter = 1;
  let firstStudentCnic = "";
  let firstParentCnic = "";

  for (const section of sections) {
    const size = rng.int(14, 20);

    for (let roll = 1; roll <= size; roll++) {
      const female = rng.chance(0.48);
      const first = rng.pick(female ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES);
      const last = rng.pick(LAST_NAMES);

      const studentCnic = nextCnic();
      if (!firstStudentCnic) firstStudentCnic = studentCnic;

      const studentUserId = id("user");
      const profileId = id("sprof");

      userRows.push({
        id: studentUserId,
        cnic: encryptField(studentCnic),
        cnicHash: blindIndex(studentCnic),
        name: `${first} ${last}`,
        role: "STUDENT",
        passwordHash,
        lastLoginAt: rng.chance(0.6) ? new Date(TODAY.getTime() - rng.int(0, 240) * 3600_000) : null,
      });

      studentProfileRows.push({
        id: profileId,
        userId: studentUserId,
        admissionNumber: `CGS-${2026 - (section.grade - 1)}-${String(admissionCounter++).padStart(4, "0")}`,
        rollNumber: String(roll),
        // Age roughly tracks the grade: a Grade 1 student is ~5.
        dateOfBirth: utcDate(2026 - (section.grade + 4), rng.int(1, 12), rng.int(1, 28)),
        gender: female ? "Female" : "Male",
        address: `House ${rng.int(1, 400)}, Street ${rng.int(1, 40)}, ${rng.pick([
          "Gulberg", "Model Town", "Johar Town", "Cantt", "DHA Phase 4", "Faisal Town",
        ])}, Lahore`,
        admissionDate: utcDate(2026 - (section.grade - 1), 8, rng.int(1, 25)),
      });

      enrollmentRows.push({
        id: id("enr"),
        studentId: profileId,
        sectionId: section.id,
        academicYearId: yearId,
      });

      // Guardian account, sharing the student's family name.
      const guardianIsFather = rng.chance(0.7);
      const guardianCnic = nextCnic();
      if (!firstParentCnic) firstParentCnic = guardianCnic;
      const guardianUserId = id("user");
      const guardianPhone = `+9230${String(21000000 + students.length)}`;

      userRows.push({
        id: guardianUserId,
        cnic: encryptField(guardianCnic),
        cnicHash: blindIndex(guardianCnic),
        name: `${guardianIsFather ? rng.pick(MALE_FIRST_NAMES) : rng.pick(FEMALE_FIRST_NAMES)} ${last}`,
        phone: guardianPhone,
        phoneHash: blindIndex(guardianPhone),
        role: "PARENT",
        passwordHash,
        lastLoginAt: rng.chance(0.5) ? new Date(TODAY.getTime() - rng.int(0, 400) * 3600_000) : null,
      });

      parentLinkRows.push({
        id: id("plink"),
        parentId: guardianUserId,
        studentId: profileId,
        relationship: guardianIsFather ? "FATHER" : "MOTHER",
        isPrimary: true,
      });

      students.push({
        profileId,
        userId: studentUserId,
        name: `${first} ${last}`,
        sectionId: section.id,
        grade: section.grade,
        ability: 0.42 + rng.next() * 0.5,
        reliability: 0.82 + rng.next() * 0.17,
      });
    }
  }

  // Users first: sections reference a class teacher, and every profile,
  // enrollment and guardian link below points back at a user row.
  await insertInChunks("users", userRows, (batch) => prisma.user.createMany({ data: batch }));
  await insertInChunks("teacher profiles", teacherProfileRows, (batch) =>
    prisma.teacherProfile.createMany({ data: batch })
  );

  await prisma.section.createMany({
    data: sections.map((s) => ({
      id: s.id,
      classId: s.classId,
      academicYearId: yearId,
      name: s.name,
      classTeacherId: s.classTeacherId,
      capacity: 30,
    })),
  });
  await insertInChunks("student profiles", studentProfileRows, (batch) =>
    prisma.studentProfile.createMany({ data: batch })
  );
  await insertInChunks("enrollments", enrollmentRows, (batch) =>
    prisma.enrollment.createMany({ data: batch })
  );
  await insertInChunks("guardian links", parentLinkRows, (batch) =>
    prisma.parentStudentLink.createMany({ data: batch })
  );

  const studentsBySection = new Map<string, SeededStudent[]>();
  for (const student of students) {
    const list = studentsBySection.get(student.sectionId) ?? [];
    list.push(student);
    studentsBySection.set(student.sectionId, list);
  }

  // -------------------------------------------------------------------
  // Teaching assignments and timetable
  // -------------------------------------------------------------------
  console.log("Seeding timetable…");

  const assignmentRows: Prisma.TeacherSubjectAssignmentCreateManyInput[] = [];
  /** Which teacher teaches a given subject in a given section. */
  const teacherFor = new Map<string, string>();

  for (const section of sections) {
    for (const code of subjectsForGrade(section.grade)) {
      const subject = subjectByCode.get(code)!;
      // Spread deterministically so each teacher ends up with a believable
      // set of sections rather than one teacher owning everything.
      const teacher = teachers[(subject.name.length + section.grade + section.name.charCodeAt(0)) % teachers.length];
      assignmentRows.push({
        id: id("tsa"),
        teacherId: teacher.id,
        subjectId: subject.id,
        sectionId: section.id,
        academicYearId: yearId,
      });
      teacherFor.set(`${section.id}:${subject.id}`, teacher.id);
    }
  }
  await insertInChunks("teaching assignments", assignmentRows, (batch) =>
    prisma.teacherSubjectAssignment.createMany({ data: batch, skipDuplicates: true })
  );

  const PERIODS = [
    { start: "08:00", end: "08:45" },
    { start: "08:45", end: "09:30" },
    { start: "09:30", end: "10:15" },
    { start: "10:35", end: "11:20" }, // after morning break
    { start: "11:20", end: "12:05" },
    { start: "12:05", end: "12:50" },
  ];
  const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

  const slotRows: Prisma.TimetableSlotCreateManyInput[] = [];
  for (const section of sections) {
    const codes = subjectsForGrade(section.grade);
    for (const day of DAYS) {
      // Saturday is a half day — three periods rather than six.
      const periodCount = day === "SATURDAY" ? 3 : PERIODS.length;
      const rotation = rng.shuffle(codes);
      for (let p = 0; p < periodCount; p++) {
        const subject = subjectByCode.get(rotation[p % rotation.length])!;
        slotRows.push({
          id: id("slot"),
          sectionId: section.id,
          subjectId: subject.id,
          teacherId: teacherFor.get(`${section.id}:${subject.id}`)!,
          dayOfWeek: day,
          startTime: PERIODS[p].start,
          endTime: PERIODS[p].end,
          room: `Room ${100 + section.grade * 2 + (section.name === "B" ? 1 : 0)}`,
        });
      }
    }
  }
  await insertInChunks("timetable slots", slotRows, (batch) =>
    prisma.timetableSlot.createMany({ data: batch })
  );

  // -------------------------------------------------------------------
  // Attendance — the last 25 school days
  // -------------------------------------------------------------------
  console.log("Seeding attendance…");

  const days = recentSchoolDays(TODAY, 25);
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const attendanceRows: Prisma.AttendanceRecordCreateManyInput[] = [];

  for (const student of students) {
    const markedById = sectionById.get(student.sectionId)!.classTeacherId!;

    for (const day of days) {
      const roll = rng.next();
      let status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
      if (roll < student.reliability) status = "PRESENT";
      else if (roll < student.reliability + 0.05) status = "LATE";
      else if (roll < student.reliability + 0.08) status = "EXCUSED";
      else status = "ABSENT";

      attendanceRows.push({
        id: id("att"),
        studentId: student.profileId,
        sectionId: student.sectionId,
        date: dateOnly(day),
        status,
        markedById,
        remarks:
          status === "EXCUSED"
            ? rng.pick(["Medical leave", "Family event", "Approved by class teacher"])
            : null,
      });
    }
  }
  await insertInChunks(
    `attendance records (${days.length} school days)`,
    attendanceRows,
    (batch) => prisma.attendanceRecord.createMany({ data: batch, skipDuplicates: true })
  );

  // -------------------------------------------------------------------
  // Assignments and submissions
  // -------------------------------------------------------------------
  console.log("Seeding assignments…");

  const assignmentDefRows: Prisma.AssignmentCreateManyInput[] = [];
  const submissionRows: Prisma.SubmissionCreateManyInput[] = [];

  for (const section of sections) {
    const roster = studentsBySection.get(section.id) ?? [];
    // Only a few subjects per section carry assignments, as in a real term.
    const codes = rng.shuffle(subjectsForGrade(section.grade)).slice(0, 3);

    for (const code of codes) {
      const subject = subjectByCode.get(code)!;
      const teacherId = teacherFor.get(`${section.id}:${subject.id}`)!;
      const titles = ASSIGNMENT_TITLES[code] ?? ["Practice Worksheet"];

      for (let a = 0; a < 2; a++) {
        // One assignment already past its due date (so it has grades), one
        // still open (so the student view has something to submit).
        const overdue = a === 0;
        const dueDate = new Date(TODAY);
        dueDate.setDate(dueDate.getDate() + (overdue ? -rng.int(6, 20) : rng.int(3, 12)));

        const assignmentId = id("asg");
        const maxMarks = rng.pick([10, 20, 25, 50]);

        assignmentDefRows.push({
          id: assignmentId,
          title: titles[a % titles.length],
          description:
            "Complete the exercises covered in class this week. Submit neatly; late submissions lose marks.",
          sectionId: section.id,
          subjectId: subject.id,
          teacherId,
          dueDate,
          maxMarks,
          createdAt: new Date(dueDate.getTime() - 7 * 86400_000),
        });

        if (!overdue) continue; // Open assignments have no submissions yet.

        for (const student of roster) {
          const roll = rng.next();
          if (roll < 0.08) {
            submissionRows.push({
              id: id("sub"),
              assignmentId,
              studentId: student.profileId,
              status: "MISSING",
            });
            continue;
          }

          const late = roll < 0.18;
          const submittedAt = new Date(
            dueDate.getTime() + (late ? rng.int(1, 48) : -rng.int(1, 72)) * 3600_000
          );
          // Marks track the student's ability, so a strong student reads as
          // strong across their whole record.
          const ratio = Math.min(0.99, Math.max(0.25, student.ability + (rng.next() - 0.5) * 0.2));

          submissionRows.push({
            id: id("sub"),
            assignmentId,
            studentId: student.profileId,
            submittedAt,
            status: "GRADED",
            marksObtained: Math.round(maxMarks * ratio),
            feedback: rng.pick([
              "Well presented — keep it up.",
              "Good effort. Check your working in the last question.",
              "Needs neater presentation.",
              "Excellent work.",
              "Review the topic again and revise the incorrect parts.",
            ]),
            gradedById: teacherId,
            gradedAt: new Date(submittedAt.getTime() + rng.int(24, 96) * 3600_000),
          });
        }
      }
    }
  }

  await insertInChunks("assignments", assignmentDefRows, (batch) =>
    prisma.assignment.createMany({ data: batch })
  );
  await insertInChunks("submissions", submissionRows, (batch) =>
    prisma.submission.createMany({ data: batch, skipDuplicates: true })
  );

  // -------------------------------------------------------------------
  // Exams and results
  // -------------------------------------------------------------------
  console.log("Seeding exams…");

  const examRows: Prisma.ExamCreateManyInput[] = [];
  const resultRows: Prisma.ExamResultCreateManyInput[] = [];

  for (const section of sections) {
    const roster = studentsBySection.get(section.id) ?? [];

    for (const code of subjectsForGrade(section.grade)) {
      const subject = subjectByCode.get(code)!;
      const teacherId = teacherFor.get(`${section.id}:${subject.id}`)!;

      // A class test already sat (results entered) and a mid-term still to
      // come (no results) — so both states are visible in the gradebook.
      const classTestId = id("exam");
      const totalMarks = 50;

      examRows.push({
        id: classTestId,
        name: "First Term Class Test",
        termId: firstTermId,
        subjectId: subject.id,
        sectionId: section.id,
        totalMarks,
        examDate: utcDate(2026, 9, rng.int(1, 8)),
        createdById: teacherId,
      });

      for (const student of roster) {
        const ratio = Math.min(0.99, Math.max(0.2, student.ability + (rng.next() - 0.5) * 0.22));
        const marks = Math.round(totalMarks * ratio);
        resultRows.push({
          id: id("res"),
          examId: classTestId,
          studentId: student.profileId,
          marksObtained: marks,
          grade: gradeForPercentage((marks / totalMarks) * 100),
          enteredById: teacherId,
        });
      }

      examRows.push({
        id: id("exam"),
        name: "Mid Term Examination",
        termId: firstTermId,
        subjectId: subject.id,
        sectionId: section.id,
        totalMarks: 100,
        examDate: utcDate(2026, 10, rng.int(12, 23)),
        createdById: teacherId,
      });
    }
  }

  await insertInChunks("exams", examRows, (batch) => prisma.exam.createMany({ data: batch }));
  await insertInChunks("exam results", resultRows, (batch) =>
    prisma.examResult.createMany({ data: batch, skipDuplicates: true })
  );

  // -------------------------------------------------------------------
  // Fees
  // -------------------------------------------------------------------
  console.log("Seeding fees…");

  const feeCategoryRows = FEE_CATEGORIES.map((name) => ({ id: id("fcat"), name }));
  await prisma.feeCategory.createMany({ data: feeCategoryRows });
  const tuitionId = feeCategoryRows.find((c) => c.name === "Tuition Fee")!.id;

  const structureRows = sections.map((section) => ({
    id: id("fstr"),
    sectionId: section.id,
    academicYearId: yearId,
    feeCategoryId: tuitionId,
    // Senior grades cost more, as they would in a real fee schedule.
    amount: 4500 + section.grade * 450,
    frequency: "MONTHLY" as const,
    dueDayOfMonth: 10,
  }));
  await prisma.feeStructure.createMany({ data: structureRows });
  const structureBySection = new Map(structureRows.map((s) => [s.sectionId, s]));

  const invoiceRows: Prisma.FeeInvoiceCreateManyInput[] = [];
  const paymentRows: Prisma.FeePaymentCreateManyInput[] = [];
  let invoiceCounter = 1;
  let receiptCounter = 1;
  const billingMonths = [8, 9]; // August and September 2026

  for (const student of students) {
    const structure = structureBySection.get(student.sectionId)!;

    for (const month of billingMonths) {
      const dueDate = utcDate(2026, month, 10);
      const isPast = dueDate < TODAY;
      const roll = rng.next();

      let status: "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";
      if (isPast) status = roll < 0.78 ? "PAID" : roll < 0.9 ? "OVERDUE" : "PARTIAL";
      else status = roll < 0.35 ? "PAID" : "PENDING";

      const discount = rng.chance(0.08) ? Math.round(structure.amount * 0.25) : 0;
      const lateFee = status === "OVERDUE" ? 500 : 0;
      const totalAmount = structure.amount - discount + lateFee;
      const invoiceId = id("inv");

      invoiceRows.push({
        id: invoiceId,
        invoiceNumber: `INV-2026-${String(invoiceCounter++).padStart(5, "0")}`,
        studentId: student.profileId,
        feeStructureId: structure.id,
        termId: firstTermId,
        amount: structure.amount,
        discount,
        lateFee,
        totalAmount,
        status,
        dueDate,
        issuedAt: utcDate(2026, month, 1),
        issuedById: principal.id,
      });

      if (status === "PAID" || status === "PARTIAL") {
        paymentRows.push({
          id: id("pay"),
          invoiceId,
          amountPaid: status === "PAID" ? totalAmount : Math.round(totalAmount * 0.5),
          paymentMethod: rng.pick(["CASH", "BANK_TRANSFER", "JAZZCASH", "EASYPAISA", "CHEQUE"]),
          paidAt: new Date(dueDate.getTime() - rng.int(0, 8) * 86400_000),
          receivedById: principal.id,
          receiptNumber: `RCP-2026-${String(receiptCounter++).padStart(5, "0")}`,
        });
      }
    }
  }

  await insertInChunks("fee invoices", invoiceRows, (batch) =>
    prisma.feeInvoice.createMany({ data: batch })
  );
  await insertInChunks("fee payments", paymentRows, (batch) =>
    prisma.feePayment.createMany({ data: batch })
  );

  // -------------------------------------------------------------------
  // Announcements, notifications, help desk
  // -------------------------------------------------------------------
  console.log("Seeding communication…");

  await prisma.announcement.createMany({
    data: ANNOUNCEMENTS.map((announcement, index) => ({
      id: id("ann"),
      title: announcement.title,
      body: announcement.body,
      authorId: principal.id,
      audience: announcement.audience,
      publishedAt: new Date(TODAY.getTime() - index * 2 * 86400_000),
    })),
  });

  // A handful of unread notifications so the bell badge is populated.
  const notificationTargets = rng.shuffle(students).slice(0, 40);
  await prisma.notification.createMany({
    data: notificationTargets.map((student) => ({
      id: id("notif"),
      userId: student.userId,
      type: rng.pick(["ANNOUNCEMENT", "GRADE", "ASSIGNMENT", "FEE"] as const),
      title: rng.pick([
        "Mid-term datesheet published",
        "New assignment posted in Mathematics",
        "Your class test result is available",
        "Fee invoice for September is due",
      ]),
      body: "Open the portal to view the details.",
      link: "/",
      createdAt: new Date(TODAY.getTime() - rng.int(1, 96) * 3600_000),
    })),
  });

  const ticketSubjects = [
    { subject: "Unable to view my child's attendance", category: "Portal access" },
    { subject: "Fee challan shows incorrect amount", category: "Fees" },
    { subject: "Request for transport route change", category: "Transport" },
    { subject: "Duplicate result card required", category: "Examinations" },
    { subject: "Password reset not received by email", category: "Portal access" },
  ];

  const guardianIds = parentLinkRows.slice(0, 5).map((link) => link.parentId);
  const ticketRows: Prisma.DeskTicketCreateManyInput[] = [];
  const ticketMessageRows: Prisma.DeskTicketMessageCreateManyInput[] = [];

  ticketSubjects.forEach((ticket, index) => {
    const raisedById = guardianIds[index % guardianIds.length];
    if (!raisedById) return;
    const ticketId = id("tick");

    ticketRows.push({
      id: ticketId,
      raisedById,
      subject: ticket.subject,
      category: ticket.category,
      status: index < 3 ? "OPEN" : index === 3 ? "IN_PROGRESS" : "RESOLVED",
      priority: rng.pick(["LOW", "MEDIUM", "HIGH"] as const),
      assignedToId: index >= 3 ? principal.id : null,
      createdAt: new Date(TODAY.getTime() - rng.int(1, 14) * 86400_000),
      resolvedAt: index === 4 ? new Date(TODAY.getTime() - 86400_000) : null,
    });

    ticketMessageRows.push({
      id: id("tmsg"),
      ticketId,
      authorId: raisedById,
      message: "Assalam-o-Alaikum. Kindly look into this at your earliest convenience. Jazak Allah.",
    });
  });

  await prisma.deskTicket.createMany({ data: ticketRows });
  await prisma.deskTicketMessage.createMany({ data: ticketMessageRows });

  // -------------------------------------------------------------------

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n✓ Demo school seeded in ${elapsed}s.`);
  console.log(`  ${students.length} students · ${teachers.length} teachers · ${sections.length} sections`);
  console.log(`\n  Every demo account uses the password: ${DEMO_PASSWORD}`);
  console.log("  Sign in with a CNIC (13 digits, no dashes):");
  console.log(`    Teacher:  ${firstTeacherCnic}`);
  console.log(`    Student:  ${firstStudentCnic}`);
  console.log(`    Guardian: ${firstParentCnic}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
