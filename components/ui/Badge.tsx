import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "outline";

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-surface-hover text-fg-muted",
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  outline: "border border-line text-fg-muted",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Shows a small filled dot before the label — useful for status columns. */
  dot?: boolean;
}

export function Badge({ variant = "neutral", dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 flex-none rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
