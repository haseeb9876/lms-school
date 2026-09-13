import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

export type StatTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

const TONES: Record<StatTone, string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-hover text-fg-muted",
};

/**
 * A wash of the card's own tone, bled from the top-left corner.
 *
 * Carries the meaning that the icon chip already states, so the card reads
 * before it is read — a wall of overdue fees looks different from a wall of
 * attendance at a glance. Kept very low in opacity: it should register as
 * the card having a temperature, not as a coloured box.
 */
const TINTS: Record<StatTone, string> = {
  brand: "from-brand/[0.07]",
  success: "from-success/[0.07]",
  warning: "from-warning/[0.08]",
  danger: "from-danger/[0.08]",
  info: "from-info/[0.07]",
  neutral: "from-fg/[0.03]",
};

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: StatTone;
  /** Percentage change vs. the previous period. Sign decides the arrow. */
  trend?: number;
  /** Set when a *falling* number is the good outcome (absences, overdue fees). */
  invertTrend?: boolean;
  href?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "neutral",
  trend,
  invertTrend = false,
  href,
}: StatCardProps) {
  const hasTrend = typeof trend === "number" && Number.isFinite(trend) && trend !== 0;
  const rising = (trend ?? 0) > 0;
  // "Good" is about direction of value, not sign: 12% more absences is bad,
  // 12% fewer overdue invoices is good.
  const good = invertTrend ? !rising : rising;
  const TrendIcon = rising ? TrendingUp : TrendingDown;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-fg-subtle">
          {label}
        </p>
        <span
          className={cn(
            "flex h-9 w-9 flex-none items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
            TONES[tone]
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap items-baseline gap-2">
        {/*
          The number is the card: real weight and tight tracking so a row of
          these reads as data rather than boxes with text in.

          Sized responsively because the card is half a phone screen wide and
          some of these values are long — "Rs 735,779" at the desktop size
          was being clipped by the card's own overflow, which is worse than
          overflowing because it silently shows the wrong figure.
        */}
        <p className="min-w-0 text-xl font-bold leading-none tabular-nums tracking-[-0.02em] text-fg sm:text-2xl lg:text-[1.75rem]">
          {value}
        </p>
        {hasTrend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
              good ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
            )}
          >
            <TrendIcon className="h-3 w-3" aria-hidden="true" />
            {Math.abs(trend!).toFixed(1)}%
          </span>
        )}
      </div>

      {hint && <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{hint}</p>}
    </>
  );

  const shell = cn(
    "group relative overflow-hidden rounded-xl border border-line bg-surface-raised p-4 shadow-soft",
    // The tint is a gradient rather than a flat fill so it fades out before
    // it reaches the number, which has to stay on a clean ground to read.
    "bg-gradient-to-br to-transparent",
    TINTS[tone]
  );

  if (!href) return <div className={shell}>{body}</div>;

  return (
    <Link
      href={href}
      className={cn(
        shell,
        // Lifts a little on hover so a linked card is obviously pressable,
        // and settles back rather than snapping.
        "block transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      )}
    >
      {body}
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        View details
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </span>
    </Link>
  );
}
