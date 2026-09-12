"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { checkPassword } from "@/lib/password-policy";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setServerError(null);

    // Checked here against the same rules the server enforces, so the
    // failure is shown under the field rather than arriving as a bare
    // message after a round trip.
    const errors: Record<string, string> = {};
    const check = checkPassword(password);
    if (!check.valid) errors.password = check.reason ?? "Doesn't meet the requirements.";
    if (password !== confirmation) errors.confirmation = "The two passwords don't match.";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setServerError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-fg">Password updated</p>
          <p className="mt-1 text-sm text-fg-muted">
            Every device that was signed in has been signed out. Use your new password to sign in
            again.
          </p>
        </div>
        <Button onClick={() => router.push("/login")}>Go to sign in</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {serverError && <Alert variant="danger">{serverError}</Alert>}

      <PasswordField
        label="New password"
        autoComplete="new-password"
        required
        showRequirements
        value={password}
        onValueChange={setPassword}
        error={fieldErrors.password}
        autoFocus
      />

      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        required
        value={confirmation}
        onValueChange={setConfirmation}
        error={fieldErrors.confirmation}
      />

      <Button type="submit" loading={submitting}>
        Update password
      </Button>

      <p className="text-center text-xs text-fg-subtle">
        This link can only be used once, and expires 45 minutes after it was sent.
      </p>
    </form>
  );
}
