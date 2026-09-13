import Link from "next/link";
import type { Role } from "@prisma/client";
import {
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  LifeBuoy,
  Megaphone,
  ScrollText,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The four things this person most likely opened the app to do, written as
 * the question they came with.
 *
 * The dashboards below this are data-first — counts, averages, charts — and
 * that is right for a principal deciding something on a Monday morning. It
 * is wrong for the largest group of users here: a parent who is not
 * technical, is on a phone, and wants to know whether their child was in
 * school today. Faced with a grid of statistics they have to work out which
 * number answers that, and which word in the menu leads to it.
 *
 * So each tile is labelled with the task and subtitled with the question,
 * in the plainest words available — "Has my child been in school?" rather
 * than "Attendance records". Nothing here is new functionality; it is the
 * same destinations the navigation already has, named the way someone would
 * ask for them out loud.
 *
 * Tiles are deliberately large. A parent using this is often one-handed,
 * outdoors, on a cracked screen, and small tap targets are the single most
 * common reason an app feels hard to use.
 */
interface QuickAction {
  label: string;
  question: string;
  href: string;
  icon: LucideIcon;
  tone: "brand" | "success" | "info" | "warning";
}

const TONES: Record<QuickAction["tone"], string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
};

const ACTIONS: Record<Role, QuickAction[]> = {
  PARENT: [
    {
      label: "Attendance",
      question: "Has my child been in school?",
      href: "/children",
      icon: CalendarCheck,
      tone: "success",
    },
    {
      label: "Results",
      question: "How are they doing in class?",
      href: "/results",
      icon: FileBarChart,
      tone: "brand",
    },
    {
      label: "Fees",
      question: "What do I still owe?",
      href: "/fees",
      icon: Wallet,
      tone: "warning",
    },
    {
      label: "Message the school",
      question: "Ask the principal privately",
      href: "/helpdesk",
      icon: LifeBuoy,
      tone: "info",
    },
  ],
  STUDENT: [
    {
      label: "My timetable",
      question: "What do I have today?",
      href: "/timetable",
      icon: CalendarDays,
      tone: "brand",
    },
    {
      label: "My homework",
      question: "What do I need to hand in?",
      href: "/assignments",
      icon: ScrollText,
      tone: "warning",
    },
    {
      label: "My results",
      question: "How did I do?",
      href: "/results",
      icon: FileBarChart,
      tone: "success",
    },
    {
      label: "Exam datesheet",
      question: "When do exams start?",
      href: "/datesheets",
      icon: CalendarCheck,
      tone: "info",
    },
  ],
  TEACHER: [
    {
      label: "Mark the register",
      question: "Take today's attendance",
      href: "/attendance/mark",
      icon: ClipboardCheck,
      tone: "brand",
    },
    {
      label: "Set homework",
      question: "Give my class an assignment",
      href: "/assignments",
      icon: ScrollText,
      tone: "warning",
    },
    {
      label: "Enter marks",
      question: "Record exam results",
      href: "/exams",
      icon: FileBarChart,
      tone: "success",
    },
    {
      label: "My timetable",
      question: "Which class am I teaching?",
      href: "/timetable",
      icon: CalendarDays,
      tone: "info",
    },
  ],
  PRINCIPAL: [
    {
      label: "Add a student",
      question: "Enrol someone new",
      href: "/students",
      icon: UserPlus,
      tone: "brand",
    },
    {
      label: "Send a notice",
      question: "Tell parents or staff something",
      href: "/announcements",
      icon: Megaphone,
      tone: "info",
    },
    {
      label: "Fees",
      question: "Who has not paid?",
      href: "/fees",
      icon: Wallet,
      tone: "warning",
    },
    {
      label: "Reports",
      question: "How is the school doing?",
      href: "/reports",
      icon: FileBarChart,
      tone: "success",
    },
  ],
};

export function QuickActions({ role }: { role: Role }) {
  const actions = ACTIONS[role];
  if (!actions?.length) return null;

  return (
    <section aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" className="sr-only">
        Common tasks
      </h2>

      <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.href + action.label}>
              <Link
                href={action.href}
                className={cn(
                  // min-h keeps every tile a comfortable thumb target even
                  // when one label wraps to two lines and another does not.
                  "flex h-full min-h-[5.5rem] flex-col gap-2 rounded-xl border border-line bg-surface-raised p-3.5",
                  "shadow-soft transition-all duration-200",
                  "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  // Removes the grey flash iOS paints over a tapped link.
                  "[-webkit-tap-highlight-color:transparent] active:translate-y-0 active:shadow-soft"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-9 w-9 flex-none items-center justify-center rounded-lg",
                    TONES[action.tone]
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight text-fg">
                    {action.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-fg-subtle">
                    {action.question}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
