import { cn } from "@/lib/cn";

export type ProgressTone = "brand" | "success" | "warning" | "danger";

const TONES: Record<ProgressTone, string> = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/**
 * Picks a tone from the value itself, so an 96% attendance bar reads green
 * and a 54% one reads red without every call site restating the thresholds.
 */
export function toneForPercent(percent: number): ProgressTone {
  if (percent >= 85) return "success";
  if (percent >= 70) return "warning";
  return "danger";
}

export function ProgressBar({
  value,
  max = 100,
  tone = "brand",
  label,
  showValue = false,
  className,
}: {
  value: number;
  max?: number;
  tone?: ProgressTone;
  label?: string;
  showValue?: boolean;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          {label && <span className="font-medium text-fg-muted">{label}</span>}
          {showValue && <span className="tabular-nums text-fg-subtle">{percent.toFixed(0)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-hover"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", TONES[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Circular variant for the single headline figure on a dashboard — reads as
 * a gauge rather than as one more row in a list of bars.
 */
export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  tone = "brand",
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: ProgressTone;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const strokeColor = { brand: "var(--color-brand)", success: "var(--color-success)", warning: "var(--color-warning)", danger: "var(--color-danger)" }[tone];

  return (
    <div className="relative inline-flex flex-none items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${label ?? "Progress"}: ${clamped.toFixed(0)}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-hover"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={strokeColor}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          // Rotated so the arc starts at 12 o'clock instead of 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums text-fg">{clamped.toFixed(0)}%</span>
        {label && <span className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</span>}
      </div>
    </div>
  );
}
