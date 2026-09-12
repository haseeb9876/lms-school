import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { CONTROL_CLASS, FieldShell, describedBy } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  /** Adds a non-value first option, e.g. "All classes" or "Select a subject". */
  placeholder?: string;
}

/**
 * Built on the native <select> rather than a custom listbox. On phones this
 * gets the OS picker — which is faster and more accessible than any custom
 * dropdown — and teachers use this app on phones constantly (marking
 * attendance at the classroom door, not at a desk).
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, id, className, options, placeholder, required, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <FieldShell id={selectId} label={label} hint={hint} error={error} required={required}>
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-describedby={describedBy(selectId, hint, error)}
            aria-invalid={!!error || undefined}
            className={cn(CONTROL_CLASS, "h-10 appearance-none pr-9", className)}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 h-4 w-4 text-fg-subtle"
            aria-hidden="true"
          />
        </div>
      </FieldShell>
    );
  }
);
SelectField.displayName = "SelectField";
