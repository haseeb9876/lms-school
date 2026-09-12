import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shared label/hint/error shell for every form control. Centralising it is
 * what keeps `aria-describedby` and `aria-invalid` wiring correct across
 * inputs, selects, textareas and checkboxes — when each control built its
 * own, accessibility drifted control by control.
 */
export interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function FieldShell({ id, label, hint, error, required, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Shared visual treatment for text-entry controls. */
export const CONTROL_CLASS =
  "w-full rounded-md border border-line bg-surface px-3 text-sm text-fg " +
  "placeholder:text-fg-subtle transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface-hover " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger";
