import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  hint?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, hint, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className={cn("flex items-start gap-2.5", className)}>
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          className={cn(
            "mt-0.5 h-4 w-4 flex-none cursor-pointer rounded border-line-strong text-brand",
            "accent-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
          {...props}
        />
        <div className="min-w-0">
          <label htmlFor={inputId} className="cursor-pointer text-sm text-fg">
            {label}
          </label>
          {hint && (
            <p id={`${inputId}-hint`} className="text-xs text-fg-subtle">
              {hint}
            </p>
          )}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";
