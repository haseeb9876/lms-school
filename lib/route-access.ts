import type { Role } from "@prisma/client";

/**
 * Which roles may reach which routes, checked before anything renders.
 *
 * Pages already call `requireAuth([...])`, and that stays — but it runs
 * *during* rendering. Now that every segment has a `loading.tsx`, Next.js
 * streams the shell and skeleton the instant a request arrives, so by the
 * time a page component decides to refuse, the 200 and the opening HTML have
 * already gone out. The refusal still happens (as a client-side redirect,
 * and no protected data is ever rendered), but the response is no longer an
 * honest 3xx, and anything that doesn't execute JavaScript — a crawler, a
 * script, a monitoring check — sees a 200.
 *
 * Deciding here, in the proxy, restores that: a role that may not have the
 * route is redirected before a byte of it is produced. The in-page checks
 * remain as defence in depth, since this table is matched on path prefixes
 * and cannot express row-level rules like "only this teacher's classes".
 */
export interface RouteRule {
  /** Matched as an exact path or as a path prefix followed by "/". */
  prefix: string;
  roles: Role[];
}

const ALL: Role[] = ["PRINCIPAL", "TEACHER", "STUDENT", "PARENT"];

/**
 * Ordered most specific first — the first match wins, so a nested route can
 * be stricter than its parent.
 */
export const ROUTE_RULES: RouteRule[] = [
  { prefix: "/principal", roles: ["PRINCIPAL"] },
  { prefix: "/settings/academic", roles: ["PRINCIPAL"] },
  { prefix: "/reports", roles: ["PRINCIPAL"] },
  { prefix: "/teachers", roles: ["PRINCIPAL"] },
  { prefix: "/guardians", roles: ["PRINCIPAL"] },

  { prefix: "/students", roles: ["PRINCIPAL", "TEACHER"] },
  { prefix: "/classes", roles: ["PRINCIPAL", "TEACHER"] },
  { prefix: "/exams", roles: ["PRINCIPAL", "TEACHER"] },
  { prefix: "/attendance/mark", roles: ["PRINCIPAL", "TEACHER"] },

  { prefix: "/children", roles: ["PARENT"] },
  { prefix: "/results", roles: ["STUDENT", "PARENT"] },

  { prefix: "/assignments", roles: ["PRINCIPAL", "TEACHER", "STUDENT"] },
  { prefix: "/fees", roles: ["PRINCIPAL", "STUDENT", "PARENT"] },

  // Everyone signed in: /dashboard, /attendance, /timetable,
  // /announcements, /helpdesk, /settings/{security,profile}.
  { prefix: "/dashboard", roles: ALL },
  { prefix: "/attendance", roles: ALL },
  { prefix: "/timetable", roles: ALL },
  { prefix: "/announcements", roles: ALL },
  { prefix: "/helpdesk", roles: ALL },
  { prefix: "/settings", roles: ALL },
];

/**
 * Returns false only when a rule explicitly excludes the role. A path with
 * no rule is left to the page's own `requireAuth` rather than being denied
 * here — this table is an early filter, not the authority.
 */
export function roleMayAccess(pathname: string, role: Role): boolean {
  const rule = ROUTE_RULES.find(
    (candidate) => pathname === candidate.prefix || pathname.startsWith(`${candidate.prefix}/`)
  );
  return rule ? rule.roles.includes(role) : true;
}
