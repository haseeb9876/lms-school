import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ErrorTone = "danger" | "warning" | "neutral";

const TONES: Record<ErrorTone, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-surface-hover text-fg-muted",
};

export interface ErrorAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

/**
 * The shared shape of every "this didn't work" screen.
 *
 * Written to be useful rather than decorative: it says what happened in
 * plain words, what the reader can do next, and — when there is one — the
 * reference the school office needs to look the failure up. A dead end that
 * only says "Error" makes people retry the same broken thing.
 */
export function ErrorScreen({
  icon: Icon,
  tone = "danger",
  title,
  description,
  reference,
  actions,
  footer,
}: {
  icon: LucideIcon;
  tone?: ErrorTone;
  title: string;
  description: string;
  reference?: string;
  actions?: ErrorAction[];
  footer?: string;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-sunken px-5 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl",
            TONES[tone]
          )}
        >
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
          <p className="text-sm leading-relaxed text-fg-muted">{description}</p>
        </div>

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {actions.map((action) => {
              const className = cn(
                "inline-flex h-10 items-center rounded-md px-4 text-sm font-medium transition-all",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                action.variant === "secondary"
                  ? "border border-line bg-surface text-fg hover:bg-surface-hover"
                  : "bg-brand text-brand-fg shadow-soft hover:brightness-110"
              );

              return action.href ? (
                <Link key={action.label} href={action.href} className={className}>
                  {action.label}
                </Link>
              ) : (
                <button key={action.label} type="button" onClick={action.onClick} className={className}>
                  {action.label}
                </button>
              );
            })}
          </div>
        )}

        {reference && (
          <p className="rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs text-fg-subtle">
            Reference: {reference}
          </p>
        )}

        {footer && <p className="text-xs text-fg-subtle">{footer}</p>}
      </div>
    </div>
  );
}
