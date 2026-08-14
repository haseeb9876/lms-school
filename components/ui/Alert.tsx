import type { HTMLAttributes } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";

export type AlertVariant = "danger" | "success" | "info" | "warning";

const VARIANTS: Record<AlertVariant, { container: string; icon: typeof Info }> = {
  danger: { container: "bg-danger-soft text-danger border-danger/20", icon: AlertTriangle },
  success: { container: "bg-success-soft text-success border-success/20", icon: CheckCircle2 },
  info: { container: "bg-info-soft text-info border-info/20", icon: Info },
  warning: { container: "bg-warning-soft text-warning border-warning/20", icon: AlertTriangle },
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export function Alert({ variant = "info", className, children, ...props }: AlertProps) {
  const { container, icon: Icon } = VARIANTS[variant];
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm", container, className)}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
