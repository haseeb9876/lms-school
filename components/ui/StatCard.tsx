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
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
        <span className={cn("flex h-8 w-8 flex-none items-center justify-center rounded-md", TONES[tone])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-fg">{value}</p>
        {hasTrend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              good ? "text-success" : "text-danger"
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {Math.abs(trend!).toFixed(1)}%
          </span>
        )}
      </div>

      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </>
  );

  const shell = "rounded-lg border border-line bg-surface-raised p-4 shadow-soft";

  if (!href) return <div className={shell}>{body}</div>;

  return (
    <Link
      href={href}
      className={cn(
        shell,
        "group block transition-all hover:border-line-strong hover:shadow-raised",
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
