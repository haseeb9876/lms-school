#!/usr/bin/env tsx
/**
 * Signs in as one account of every role and requests each route that role
 * can reach, reporting the HTTP status of each.
 *
 * This exists because the expensive failures in this app aren't type errors
 * — they're a page that compiles perfectly and then throws at request time
 * on a null relation, or a route that quietly 403s for the one role that
 * actually needs it. Those only show up when something signs in and asks
 * for the page, which is exactly what this does.
 *
 * Run against a dev server with demo data:
 *   npm run dev
 *   npm run smoke
 */
import { PrismaClient } from "@prisma/client";
import { createSession, ACCESS_COOKIE } from "../lib/auth/session";
import {
  threwWhileRendering,
  renderFailureDetail,
  streamedRedirectTarget,
} from "./lib/render-failure";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

type Role = "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT";

/** `:id` placeholders are filled from the database before the request. */
const ROUTES: Record<Role, string[]> = {
  PRINCIPAL: [
    "/dashboard",
    "/students",
    "/students/:studentId",
    "/students/:studentId?tab=attendance",
    "/students/:studentId?tab=results",
    "/students/:studentId?tab=fees",
    "/teachers",
    "/teachers/:teacherId",
    "/guardians",
    "/classes",
    "/classes/:sectionId",
    "/classes/:sectionId?tab=subjects",
    "/classes/:sectionId?tab=timetable",
    "/timetable",
    "/attendance",
    "/attendance/mark",
    "/assignments",
    "/assignments/:assignmentId",
    "/exams",
    "/exams/:examId",
    "/fees",
    "/fees/invoices/:invoiceId",
    "/announcements",
    "/datesheets",
    "/helpdesk",
    "/reports",
    "/settings/academic",
    "/settings/academic?tab=classes",
    "/settings/academic?tab=subjects",
    "/settings/academic?tab=staffing",
    "/principal/settings/branding",
    "/principal/recovery",
    "/settings/security",
    "/settings/notifications",
    "/settings/profile",
  ],
  TEACHER: [
    "/dashboard",
    "/students",
    "/classes",
    "/timetable",
    "/attendance",
    "/attendance/mark",
    "/assignments",
    "/assignments/:assignmentId",
    "/exams",
    "/exams/:examId",
    "/announcements",
    "/helpdesk",
    "/settings/security",
    "/settings/notifications",
  ],
  STUDENT: [
    "/dashboard",
    "/timetable",
    "/attendance",
    "/assignments",
    "/results",
    "/fees",
    "/announcements",
    "/helpdesk",
    "/settings/security",
    "/settings/notifications",
  ],
  PARENT: [
    "/dashboard",
    "/children",
    "/timetable",
    "/results",
    "/settings/profile",
    "/fees",
    "/announcements",
    "/helpdesk",
    "/settings/security",
    "/settings/notifications",
  ],
};

/** Routes a role must NOT reach — a 200 here is an authorization hole. */
const FORBIDDEN: Partial<Record<Role, string[]>> = {
  TEACHER: ["/teachers", "/guardians", "/reports", "/settings/academic", "/principal/settings/branding", "/principal/recovery"],
  STUDENT: ["/students", "/teachers", "/guardians", "/classes", "/reports", "/settings/academic", "/principal/settings/branding", "/principal/recovery"],
  PARENT: ["/students", "/teachers", "/guardians", "/classes", "/reports", "/settings/academic", "/principal/settings/branding", "/principal/recovery"],
};

/**
 * Mints a session directly rather than posting to /api/auth/login.
 *
 * The login endpoint is rate limited to five attempts per IP per fifteen
 * minutes — correct behaviour, but it means a smoke run that signs in as
 * four roles starts failing as soon as it's run twice in a row. Issuing the
 * session through the same helper the login route uses exercises the real
 * session format while leaving the brute-force protection alone.
 */
async function sessionCookieFor(role: Role): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { role, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true },
  });
  if (!user) return null;

  const { accessToken } = await createSession({ userId: user.id, role: user.role });
  return `${ACCESS_COOKIE}=${accessToken}`;
}

/**
 * Fixtures for the `:id` placeholders, resolved per role.
 *
 * Picking a globally-first assignment or exam would hand a teacher a record
 * from a class they don't teach — the app correctly refuses that, and the
 * check would report its own bad fixture as a failure. Each role gets ids it
 * is genuinely entitled to.
 */
async function resolvePlaceholders(role: Role): Promise<Record<string, string>> {
  const teacher = await prisma.user.findFirst({
    where: { role: "TEACHER", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const actingTeacherId =
    role === "TEACHER"
      ? (
          await prisma.user.findFirst({
            where: { role: "TEACHER", status: "ACTIVE" },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          })
        )?.id
      : undefined;

  const sectionScope = actingTeacherId
    ? { teacherAssignments: { some: { teacherId: actingTeacherId } } }
    : {};

  const [student, section, invoice, assignment, exam, ticket] = await Promise.all([
    prisma.studentProfile.findFirst({ select: { id: true } }),
    prisma.section.findFirst({ where: sectionScope, select: { id: true } }),
    prisma.feeInvoice.findFirst({ select: { id: true } }),
    prisma.assignment.findFirst({
      where: actingTeacherId ? { section: sectionScope } : {},
      select: { id: true },
    }),
    prisma.exam.findFirst({
      where: actingTeacherId ? { section: sectionScope } : {},
      select: { id: true },
    }),
    prisma.deskTicket.findFirst({ select: { id: true } }),
  ]);

  return {
    ":studentId": student?.id ?? "missing",
    ":teacherId": teacher?.id ?? "missing",
    ":sectionId": section?.id ?? "missing",
    ":invoiceId": invoice?.id ?? "missing",
    ":assignmentId": assignment?.id ?? "missing",
    ":examId": exam?.id ?? "missing",
    ":ticketId": ticket?.id ?? "missing",
  };
}

function fill(route: string, values: Record<string, string>): string {
  let filled = route;
  for (const [token, value] of Object.entries(values)) {
    filled = filled.replace(token, value);
  }
  return filled;
}

async function main() {
  let failures = 0;
  let checked = 0;

  for (const role of Object.keys(ROUTES) as Role[]) {
    const cookie = await sessionCookieFor(role);
    if (!cookie) {
      console.log(`\n${role}: no active account found — skipping.`);
      continue;
    }

    const placeholders = await resolvePlaceholders(role);
    console.log(`\n${role}`);

    for (const route of ROUTES[role]) {
      const url = fill(route, placeholders);
      /*
       * Redirects are followed rather than treated as failures: some routes
       * legitimately redirect to fill in a default (the register defaults to
       * the first class the teacher has). What actually matters is where the
       * user lands — being bounced to /login or /unauthorized is the failure,
       * not the redirect itself.
       */
      let response = await fetch(`${BASE_URL}${url}`, { headers: { cookie }, redirect: "follow" });
      checked++;

      /*
       * A 200 does not mean the page worked — see scripts/lib/render-failure.
       * Every page streams a skeleton immediately, so a Server Component that
       * throws afterwards cannot change the status line. The body has to be
       * read to find out.
       */
      let body = await response.text();
      let note = "";

      /*
       * A redirect issued *during* streaming is expressed in the body, not in
       * a Location header, so `fetch` cannot follow it. Several routes rely on
       * one — the register defaults to the teacher's first class and today's
       * date — and checking only the first response would verify a page that
       * nobody ever sees.
       */
      const streamed = streamedRedirectTarget(body);
      if (streamed) {
        note = `  → ${streamed.split("?")[0]}`;
        response = await fetch(`${BASE_URL}${streamed}`, { headers: { cookie }, redirect: "follow" });
        body = await response.text();
      }

      const landedOn = new URL(response.url).pathname;
      const bounced = landedOn === "/login" || landedOn === "/unauthorized";
      const threw = threwWhileRendering(body);
      const ok = response.status === 200 && !bounced && !threw;

      if (!ok) failures++;
      const why = threw
        ? `  → ${renderFailureDetail(body)}`
        : bounced
          ? `  → ${landedOn}`
          : note;
      console.log(`  ${ok ? "✓" : "✗"} ${response.status}  ${route}${why}`);
    }

    for (const route of FORBIDDEN[role] ?? []) {
      const url = fill(route, placeholders);
      const response = await fetch(`${BASE_URL}${url}`, { headers: { cookie }, redirect: "follow" });
      checked++;

      /*
       * "Refused" specifically means bounced to /unauthorized (or /login),
       * or an error status — not merely "didn't return 200". Checking the
       * landing path matters because this app refuses by redirecting, and a
       * route that simply doesn't exist yet would otherwise be scored as a
       * passing authorization check.
       */
      const landedOn = new URL(response.url).pathname;
      const refused =
        landedOn === "/unauthorized" || landedOn === "/login" || response.status >= 400;

      if (!refused) failures++;
      console.log(
        `  ${refused ? "✓" : "✗"} ${response.status}  ${route}  → ${landedOn}  (must be refused)`
      );
    }
  }

  console.log(`\n${checked - failures}/${checked} checks passed.`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
