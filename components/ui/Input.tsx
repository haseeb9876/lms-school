import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_CLASS, FieldShell, describedBy } from "./Field";

export interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Rendered inside the control on the leading edge (e.g. a search icon). */
  icon?: ReactNode;
  /** Rendered inside the control on the trailing edge (e.g. a unit, a toggle). */
  trailing?: ReactNode;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, hint, id, className, icon, trailing, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <FieldShell id={inputId} label={label} hint={hint} error={error} required={required}>
        <div className="relative flex items-center">
          {icon && (
            <span className="pointer-events-none absolute left-3 flex text-fg-subtle" aria-hidden="true">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-describedby={describedBy(inputId, hint, error)}
            aria-invalid={!!error || undefined}
            className={cn(CONTROL_CLASS, "h-10", icon && "pl-9", trailing && "pr-9", className)}
            {...props}
          />
          {trailing && <span className="absolute right-3 flex text-fg-subtle">{trailing}</span>}
        </div>
      </FieldShell>
    );
  }
);
InputField.displayName = "InputField";
