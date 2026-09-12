/**
 * Checks that a datesheet reaches exactly the people it is addressed to.
 *
 * A datesheet is a document with three separate doors — the list, its own
 * page, and the URL of every image on it — and a class-targeted one must be
 * shut at all three. The image route is the one that matters most in
 * practice: those URLs get forwarded in WhatsApp groups, so a page that
 * served bytes to anyone holding the link would make the scoping on the
 * surrounding page decorative.
 *
 *   npm run datesheets
 */
import { PrismaClient } from "@prisma/client";
import {
  getDatesheet,
  listDatesheets,
  findVisibleDatesheetPage,
  sectionsForViewer,
  getUpcomingDatesheet,
} from "../lib/queries/datesheets";
import { resolveRecipients } from "../lib/queries/audiences";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main(): Promise<void> {
  const principal = await prisma.user.findFirstOrThrow({ where: { role: "PRINCIPAL" } });
  const year = await prisma.academicYear.findFirstOrThrow({ where: { isCurrent: true } });

  // Two classes that genuinely share nobody, so "can't see it" is a real
  // result rather than an accident of overlapping enrolment.
  const sections = await prisma.section.findMany({
    where: { academicYearId: year.id },
    select: { id: true, name: true, class: { select: { name: true } } },
    take: 12,
  });

  let target = null as null | { id: string; label: string };
  let outsider = null as null | { userId: string; sectionId: string };

  for (const section of sections) {
    const inside = await prisma.enrollment.findFirst({
      where: { sectionId: section.id, status: "ACTIVE" },
      select: { student: { select: { userId: true } } },
    });
    if (!inside) continue;

    for (const other of sections) {
      if (other.id === section.id) continue;
      const outsideStudent = await prisma.enrollment.findFirst({
        where: { sectionId: other.id, status: "ACTIVE" },
        select: { student: { select: { userId: true } } },
      });
      if (!outsideStudent) continue;

      // Confirm the outsider really is outside the target class.
      const overlap = await prisma.enrollment.count({
        where: {
          sectionId: section.id,
          status: "ACTIVE",
          student: { userId: outsideStudent.student.userId },
        },
      });
      if (overlap === 0) {
        target = { id: section.id, label: `${section.class.name} — ${section.name}` };
        outsider = { userId: outsideStudent.student.userId, sectionId: other.id };
        break;
      }
    }
    if (target) break;
  }

  if (!target || !outsider) {
    console.error("Could not find two disjoint classes with students — seed more data.");
    process.exit(1);
  }

  const insider = await prisma.enrollment.findFirstOrThrow({
    where: { sectionId: target.id, status: "ACTIVE" },
    select: { student: { select: { userId: true } } },
  });
  const insiderId = insider.student.userId;

  console.log(`\nUsing ${target.label} as the targeted class.`);

  const draft = await prisma.examDatesheet.create({
    data: {
      title: "Datesheet scoping probe",
      academicYearId: year.id,
      audience: "SECTION_WITH_GUARDIANS",
      sectionId: target.id,
      createdById: principal.id,
      status: "DRAFT",
      entries: {
        create: [{ subjectName: "Probe Paper", examDate: new Date("2099-01-01"), sortOrder: 0 }],
      },
      pages: { create: [{ storageRef: "/api/files/datesheets/probe.png", sortOrder: 0 }] },
    },
    select: { id: true, pages: { select: { id: true } } },
  });
  const pageId = draft.pages[0].id;

  try {
    console.log("\nA. A draft is invisible to everyone except its author");
    check(
      "the targeted student cannot open the draft",
      (await getDatesheet(draft.id, { userId: insiderId, role: "STUDENT" })) === null
    );
    check(
      "the draft's image is refused",
      (await findVisibleDatesheetPage(pageId, { userId: insiderId, role: "STUDENT" })) === null
    );
    check(
      "the principal can see their own draft",
      (await getDatesheet(draft.id, { userId: principal.id, role: "PRINCIPAL" })) !== null
    );

    console.log("\nB. Once published, it reaches the targeted class");
    await prisma.examDatesheet.update({
      where: { id: draft.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    check(
      "the targeted student can open it",
      (await getDatesheet(draft.id, { userId: insiderId, role: "STUDENT" })) !== null
    );
    check(
      "and can load its image",
      (await findVisibleDatesheetPage(pageId, { userId: insiderId, role: "STUDENT" })) !== null
    );
    const insiderList = await listDatesheets({ userId: insiderId, role: "STUDENT" });
    check(
      "and it appears in their list",
      insiderList.rows.some((row) => row.id === draft.id)
    );

    console.log("\nC. A student in another class is shut out at all three doors");
    check(
      "cannot open the datesheet",
      (await getDatesheet(draft.id, { userId: outsider.userId, role: "STUDENT" })) === null
    );
    check(
      "cannot load its image",
      (await findVisibleDatesheetPage(pageId, { userId: outsider.userId, role: "STUDENT" })) === null
    );
    const outsiderList = await listDatesheets({ userId: outsider.userId, role: "STUDENT" });
    check(
      "does not see it listed",
      !outsiderList.rows.some((row) => row.id === draft.id)
    );

    console.log("\nD. A guardian sees their own child's class and no other");
    const guardianLink = await prisma.parentStudentLink.findFirst({
      where: { student: { user: { id: insiderId } } },
      select: { parentId: true },
    });
    if (guardianLink) {
      check(
        "the targeted child's guardian can open it",
        (await getDatesheet(draft.id, { userId: guardianLink.parentId, role: "PARENT" })) !== null
      );
      const linkedSections = await sectionsForViewer(guardianLink.parentId, "PARENT");
      check("their sections include the targeted class", linkedSections.includes(target.id));
    }

    /*
     * "Unrelated" has to mean none of this guardian's children are in the
     * targeted class, not merely that the child we arrived through isn't.
     * Guardians here routinely have several children across classes, so
     * filtering on a single link finds someone who legitimately *can* see
     * the datesheet through a sibling — which is a broken test, not a leak.
     */
    const otherGuardian = await prisma.user.findFirst({
      where: {
        role: "PARENT",
        parentLinks: { some: {} },
        NOT: {
          parentLinks: {
            some: { student: { enrollments: { some: { sectionId: target.id, status: "ACTIVE" } } } },
          },
        },
      },
      select: { id: true },
    });
    if (otherGuardian) {
      const guardianSections = await sectionsForViewer(otherGuardian.id, "PARENT");
      check(
        "the chosen guardian really has no child in the targeted class",
        !guardianSections.includes(target.id),
        guardianSections.join(", ")
      );
      check(
        "an unrelated guardian cannot open it",
        (await getDatesheet(draft.id, { userId: otherGuardian.id, role: "PARENT" })) === null
      );
      check(
        "nor load its image",
        (await findVisibleDatesheetPage(pageId, {
          userId: otherGuardian.id,
          role: "PARENT",
        })) === null
      );
    }

    console.log("\nE. Notification recipients match who can actually open it");
    const recipients = await resolveRecipients("SECTION_WITH_GUARDIANS", target.id);
    check("somebody is notified", recipients.length > 0, String(recipients.length));
    check("the targeted student is among them", recipients.includes(insiderId));
    check("the outsider is not", !recipients.includes(outsider.userId));

    // The real failure this guards against: being notified about something
    // you then cannot open.
    const sampled = recipients.slice(0, 12);
    const roles = await prisma.user.findMany({
      where: { id: { in: sampled } },
      select: { id: true, role: true },
    });
    let mismatches = 0;
    for (const person of roles) {
      const visible = await getDatesheet(draft.id, { userId: person.id, role: person.role });
      if (!visible) mismatches++;
    }
    check(
      "every sampled recipient can open what they were told about",
      mismatches === 0,
      `${mismatches} of ${roles.length} could not`
    );

    console.log("\nF. A school-wide datesheet reaches everyone");
    const wide = await prisma.examDatesheet.create({
      data: {
        title: "School-wide scoping probe",
        academicYearId: year.id,
        audience: "ALL",
        createdById: principal.id,
        status: "PUBLISHED",
        publishedAt: new Date(),
        entries: {
          create: [{ subjectName: "Probe", examDate: new Date("2099-01-02"), sortOrder: 0 }],
        },
      },
      select: { id: true },
    });

    try {
      for (const [label, userId, role] of [
        ["the targeted student", insiderId, "STUDENT"],
        ["the other class's student", outsider.userId, "STUDENT"],
      ] as const) {
        check(
          `${label} can open a school-wide datesheet`,
          (await getDatesheet(wide.id, { userId, role })) !== null
        );
      }

      console.log("\nG. Filtering by class keeps the school-wide one visible");
      // Narrowing to a class must not hide the whole-school datesheet, which
      // is the most important result for that class.
      const narrowed = await listDatesheets({
        userId: insiderId,
        role: "STUDENT",
        sectionId: target.id,
      });
      check("the class datesheet is in the filtered list", narrowed.rows.some((r) => r.id === draft.id));
      check("so is the school-wide one", narrowed.rows.some((r) => r.id === wide.id));
    } finally {
      await prisma.examDatesheet.delete({ where: { id: wide.id } });
    }
    console.log("\nH. The dashboard banner agrees with the full visibility rule");
    /*
     * The banner uses a second, relational form of the same rule so it can
     * run in one round trip instead of two. Two expressions of one rule is
     * exactly how a class's datesheet ends up on the wrong dashboard, so
     * they are checked against each other rather than trusted to match.
     */
    await prisma.examDatesheet.update({
      where: { id: draft.id },
      data: { startsOn: new Date("2099-01-01") },
    });

    const personas: [string, string, "STUDENT" | "PARENT" | "TEACHER" | "PRINCIPAL"][] = [
      ["targeted student", insiderId, "STUDENT"],
      ["outsider student", outsider.userId, "STUDENT"],
      ["principal", principal.id, "PRINCIPAL"],
    ];

    const targetedGuardian = await prisma.parentStudentLink.findFirst({
      where: { student: { user: { id: insiderId } } },
      select: { parentId: true },
    });
    if (targetedGuardian) personas.push(["targeted guardian", targetedGuardian.parentId, "PARENT"]);

    const classTeacher = await prisma.section.findUnique({
      where: { id: target.id },
      select: { classTeacherId: true },
    });
    if (classTeacher?.classTeacherId) {
      personas.push(["its class teacher", classTeacher.classTeacherId, "TEACHER"]);
    }

    const unrelatedTeacher = await prisma.user.findFirst({
      where: {
        role: "TEACHER",
        NOT: {
          OR: [
            { classesAsTeacher: { some: { id: target.id } } },
            { teacherAssignments: { some: { sectionId: target.id } } },
          ],
        },
      },
      select: { id: true },
    });
    if (unrelatedTeacher) personas.push(["an unrelated teacher", unrelatedTeacher.id, "TEACHER"]);

    for (const [label, userId, role] of personas) {
      const viaFullRule = (await getDatesheet(draft.id, { userId, role })) !== null;
      const viaBanner =
        (await getUpcomingDatesheet(userId, role, new Date("2098-01-01")))?.id === draft.id;
      check(
        `${label}: banner and page agree (${viaFullRule ? "visible" : "hidden"})`,
        viaFullRule === viaBanner,
        `page=${viaFullRule} banner=${viaBanner}`
      );
    }
  } finally {
    await prisma.examDatesheet.delete({ where: { id: draft.id } });
  }

  await prisma.$disconnect();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.examDatesheet.deleteMany({ where: { title: { contains: "scoping probe" } } });
  process.exit(1);
});
