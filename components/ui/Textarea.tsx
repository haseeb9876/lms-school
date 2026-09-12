import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_CLASS, FieldShell, describedBy } from "./Field";

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, hint, id, className, required, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;

    return (
      <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required}>
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          required={required}
          aria-describedby={describedBy(fieldId, hint, error)}
          aria-invalid={!!error || undefined}
          className={cn(CONTROL_CLASS, "resize-y py-2 leading-relaxed", className)}
          {...props}
        />
      </FieldShell>
    );
  }
);
TextareaField.displayName = "TextareaField";
