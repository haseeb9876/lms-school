"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import { InputField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

/**
 * Requests a password reset link.
 *
 * The response is deliberately identical whether or not an account matched:
 * confirming "no account with that CNIC" would turn this form into a way to
 * test whether a particular person attends the school.
 *
 * It is also honest that this route only works for accounts with an email
 * on file. In a school that is the staff — students and guardians are issued
 * credentials at the office and have no email, so telling them to "check
 * their inbox" would send them somewhere that will never receive anything.
 */
export function ForgotPasswordForm({ officePhone }: { officePhone: string | null }) {
  const [identifier, setIdentifier] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setServerError(null);
    setFieldError(undefined);

    if (identifier.trim().length < 3) {
      setFieldError("Enter your CNIC or phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(data.message as string);
    } catch {
      setServerError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-fg">Request received</p>
          <p className="text-sm leading-relaxed text-fg-muted">{sent}</p>
        </div>

        <OfficeFallback officePhone={officePhone} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {serverError && <Alert variant="danger">{serverError}</Alert>}

      <InputField
        label="CNIC or phone number"
        inputMode="numeric"
        placeholder="4210112345671"
        autoComplete="username"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        error={fieldError}
        hint="The same one you use to sign in."
        autoFocus
      />

      <Button type="submit" loading={submitting}>
        <Mail className="h-4 w-4" aria-hidden="true" />
        Email me a reset link
      </Button>

      <OfficeFallback officePhone={officePhone} />
    </form>
  );
}

/**
 * The path most people in a school actually need. Students and guardians
 * are issued credentials in person and have no email address on file, so
 * without this the page would be a dead end for almost everyone.
 */
function OfficeFallback({ officePhone }: { officePhone: string | null }) {
  return (
    <div className="rounded-md border border-line bg-surface-sunken p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
        <Phone className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
        No email on your account?
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
        Students and guardians are issued sign-in details by the school office. Contact the office
        and they can set a new password for you straight away.
      </p>
      {officePhone && (
        <a
          href={`tel:${officePhone.replace(/\s/g, "")}`}
          className="mt-2 inline-block text-sm font-medium text-brand underline underline-offset-2"
        >
          {officePhone}
        </a>
      )}
    </div>
  );
}
