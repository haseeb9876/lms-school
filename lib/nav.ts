import type { Role } from "@prisma/client";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Palette,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  UserSquare,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  /** Marks the item active for any URL beneath it, not just an exact match. */
  matchPrefix?: boolean;
}

export interface NavGroup {
  /** Omitted for the first group, which needs no heading. */
  label?: string;
  items: NavItem[];
}

const ALL_ROLES: Role[] = ["PRINCIPAL", "TEACHER", "STUDENT", "PARENT"];

/**
 * Single source of truth for navigation across every role — the direct fix
 * for the old app shipping four different, inconsistent nav shells. Items
 * are filtered by role at render time in AppShell, not duplicated per page.
 *
 * Labels are written from the signed-in user's point of view: a teacher sees
 * "Attendance" (a thing they do to a class) while a student sees "My
 * Attendance" (a record about them). Same route, different framing, so
 * neither role has to translate the other's vocabulary.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Students", href: "/students", icon: GraduationCap, roles: ["PRINCIPAL", "TEACHER"], matchPrefix: true },
      { label: "Teachers", href: "/teachers", icon: UserSquare, roles: ["PRINCIPAL"], matchPrefix: true },
      { label: "Guardians", href: "/guardians", icon: Users, roles: ["PRINCIPAL"], matchPrefix: true },
      { label: "My Children", href: "/children", icon: Users, roles: ["PARENT"], matchPrefix: true },
    ],
  },
  {
    label: "Academics",
    items: [
      { label: "Classes", href: "/classes", icon: BookOpen, roles: ["PRINCIPAL", "TEACHER"], matchPrefix: true },
      { label: "Timetable", href: "/timetable", icon: CalendarDays, roles: ALL_ROLES, matchPrefix: true },
      { label: "Attendance", href: "/attendance", icon: ClipboardCheck, roles: ["PRINCIPAL", "TEACHER"], matchPrefix: true },
      { label: "My Attendance", href: "/attendance", icon: ClipboardCheck, roles: ["STUDENT"], matchPrefix: true },
      { label: "Assignments", href: "/assignments", icon: ScrollText, roles: ["PRINCIPAL", "TEACHER", "STUDENT"], matchPrefix: true },
      { label: "Exams & Results", href: "/exams", icon: FileBarChart, roles: ["PRINCIPAL", "TEACHER"], matchPrefix: true },
      { label: "My Results", href: "/results", icon: FileBarChart, roles: ["STUDENT", "PARENT"], matchPrefix: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Fees", href: "/fees", icon: Wallet, roles: ["PRINCIPAL", "STUDENT", "PARENT"], matchPrefix: true },
      { label: "Announcements", href: "/announcements", icon: Megaphone, roles: ALL_ROLES, matchPrefix: true },
      { label: "Help Desk", href: "/helpdesk", icon: LifeBuoy, roles: ALL_ROLES, matchPrefix: true },
      { label: "Reports", href: "/reports", icon: FileBarChart, roles: ["PRINCIPAL"], matchPrefix: true },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Academic Setup", href: "/settings/academic", icon: SlidersHorizontal, roles: ["PRINCIPAL"], matchPrefix: true },
      { label: "School Settings", href: "/principal/settings/branding", icon: Palette, roles: ["PRINCIPAL"], matchPrefix: true },
      { label: "Account Security", href: "/settings/security", icon: ShieldCheck, roles: ALL_ROLES, matchPrefix: true },
    ],
  },
];

/** Flat list — used by the command palette and for active-route matching. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * The four destinations that get a permanent slot in the phone tab bar.
 * Chosen per role by what that person opens *daily* — a teacher lands on
 * attendance every morning, a parent checks fees and results, a student
 * checks their timetable. Everything else stays one tap away under "More".
 */
const MOBILE_PRIMARY_HREFS: Record<Role, string[]> = {
  PRINCIPAL: ["/dashboard", "/students", "/attendance", "/fees"],
  TEACHER: ["/dashboard", "/attendance", "/assignments", "/classes"],
  STUDENT: ["/dashboard", "/timetable", "/assignments", "/results"],
  PARENT: ["/dashboard", "/children", "/results", "/fees"],
};

export function mobilePrimaryItems(role: Role): NavItem[] {
  const available = NAV_ITEMS.filter((item) => item.roles.includes(role));
  return MOBILE_PRIMARY_HREFS[role]
    .map((href) => available.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
}

export function navGroupsForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/dashboard") return pathname === "/dashboard";
  if (item.matchPrefix) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return pathname === item.href;
}
