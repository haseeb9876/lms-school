"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { CONTROL_CLASS, FieldShell, describedBy } from "./Field";
import {
  PASSWORD_RULES,
  checkPassword,
  passwordStrength,
  type PasswordStrength,
} from "@/lib/password-policy";

const STRENGTH: Record<PasswordStrength, { label: string; bars: number; className: string }> = {
  weak: { label: "Too weak", bars: 1, className: "bg-danger" },
  fair: { label: "Fair", bars: 2, className: "bg-warning" },
  good: { label: "Good", bars: 3, className: "bg-info" },
  strong: { label: "Strong", bars: 4, className: "bg-success" },
};

export interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  label: string;
  error?: string;
  hint?: string;
  /** Shows the live requirement checklist and strength meter. */
  showRequirements?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
}

/**
 * A password input that says what it wants *before* you get it wrong.
 *
 * The requirements are rendered from the same rules the server enforces, so
 * the list can't drift from what's actually accepted, and they're visible
 * from the moment the field is focused rather than appearing as an error
 * after a failed submit. Someone setting a password for the first time —
 * which, in this app, is every student and guardian on their first
 * sign-in — should not have to guess.
 */
export function PasswordField({
  label,
  error,
  hint,
  showRequirements = false,
  id,
  className,
  required,
  value,
  onValueChange,
  onFocus,
  ...props
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const [internal, setInternal] = useState("");
  const [touched, setTouched] = useState(false);

  const current = value ?? internal;
  const check = checkPassword(current);
  const strength = STRENGTH[passwordStrength(current)];

  // The checklist appears once the field has been used, so an untouched form
  // isn't covered in red crosses before anyone has typed anything.
  const showList = showRequirements && (touched || current.length > 0);

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} required={required}>
      <div className="relative flex items-center">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          required={required}
          value={current}
          onChange={(event) => {
            if (onValueChange) onValueChange(event.target.value);
            else setInternal(event.target.value);
          }}
          onFocus={(event) => {
            setTouched(true);
            onFocus?.(event);
          }}
          aria-describedby={cn(describedBy(inputId, hint, error), showList ? `${inputId}-rules` : "") || undefined}
          aria-invalid={!!error || undefined}
          className={cn(CONTROL_CLASS, "h-10 pr-10", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          // Typos are the main reason a password is rejected, and a school
          // office often reads these out over the phone.
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 rounded p-1.5 text-fg-subtle transition-colors hover:text-fg"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {showRequirements && current.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  index < strength.bars ? strength.className : "bg-surface-hover"
                )}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-fg-subtle">{strength.label}</span>
        </div>
      )}

      {showList && (
        <ul id={`${inputId}-rules`} className="flex flex-col gap-1">
          {PASSWORD_RULES.map((rule) => {
            const met = check.satisfied.includes(rule.id);
            return (
              <li
                key={rule.id}
                className={cn("flex items-center gap-1.5 text-xs", met ? "text-success" : "text-fg-subtle")}
              >
                {met ? (
                  <Check className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                ) : (
                  <X className="h-3.5 w-3.5 flex-none opacity-50" aria-hidden="true" />
                )}
                <span>{rule.label}</span>
                <span className="sr-only">{met ? " — met" : " — not yet met"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </FieldShell>
  );
}
