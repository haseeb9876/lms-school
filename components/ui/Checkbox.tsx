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

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  hint?: string;
}

/**
 * A checkbox underneath, styled as a switch. Keeping the native input means
 * it stays keyboard- and screen-reader-operable for free, which a
 * div-with-onClick switch does not.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, hint, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className={cn("flex items-center justify-between gap-4", className)}>
        <div className="min-w-0">
          <label htmlFor={inputId} className="cursor-pointer text-sm font-medium text-fg">
            {label}
          </label>
          {hint && (
            <p id={`${inputId}-hint`} className="text-xs text-fg-subtle">
              {hint}
            </p>
          )}
        </div>
        <label className="relative inline-flex flex-none cursor-pointer items-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer sr-only"
            aria-describedby={hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          <span
            aria-hidden="true"
            className={cn(
              "h-6 w-11 rounded-full bg-line-strong transition-colors",
              "peer-checked:bg-brand peer-disabled:opacity-60",
              "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
              "after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full",
              // Deliberately white in both themes: the knob sits on the brand
              // color when on and on a mid-grey track when off, and needs to
              // stay legible against both.
              "after:bg-white after:shadow-soft after:transition-transform after:content-['']",
              "peer-checked:after:translate-x-5"
            )}
          />
        </label>
      </div>
    );
  }
);
Switch.displayName = "Switch";
