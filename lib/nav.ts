import type { Role } from "@prisma/client";
import { LayoutDashboard, Palette, ShieldCheck } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

/**
 * Single source of truth for navigation across every role — the direct fix
 * for the old app shipping four different, inconsistent nav shells. Items
 * are filtered by role at render time in AppShell, not duplicated per page.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["PRINCIPAL", "TEACHER", "STUDENT", "PARENT"],
  },
  {
    label: "Branding & Settings",
    href: "/principal/settings/branding",
    icon: Palette,
    roles: ["PRINCIPAL"],
  },
  {
    label: "Account Security",
    href: "/settings/security",
    icon: ShieldCheck,
    roles: ["PRINCIPAL", "TEACHER", "STUDENT", "PARENT"],
  },
];
