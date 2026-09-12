"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InputField } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface FieldErrors {
  identifier?: string;
  password?: string;
}

/**
 * Plain controlled inputs rather than react-hook-form.
 *
 * The previous version paired zodResolver from @hookform/resolvers v3 with
 * Zod v4, a combination that throws validation errors instead of returning
 * them — react-hook-form never catches that, so an invalid form silently did
 * nothing. Both packages are gone; validation here is a handful of checks
 * that the server re-runs anyway.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [stage, setStage] = useState<"credentials" | "twoFactor">("credentials");
  const [twoFactorMethod, setTwoFactorMethod] = useState<"TOTP" | "EMAIL_OTP" | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** Where to land after signing in, defaulting to the dashboard. */
  function destination(): string {
    const next = searchParams.get("next");
    // Only same-origin paths — an absolute URL here would be an open redirect.
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  }

  async function onSubmitCredentials(event: FormEvent) {
    event.preventDefault();
    setServerError(null);

    const errors: FieldErrors = {};
    if (identifier.trim().length < 3) errors.identifier = "Enter your CNIC or phone number.";
    if (password.length < 1) errors.password = "Enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (data.twoFactorRequired) {
        setTwoFactorMethod(data.method);
        setStage("twoFactor");
        return;
      }

      router.push(destination());
      router.refresh();
    } catch {
      setServerError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitTwoFactor(event: FormEvent) {
    event.preventDefault();
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useRecovery ? { recoveryCode } : { code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(destination());
      router.refresh();
    } catch {
      setServerError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "twoFactor") {
    return (
      <form onSubmit={onSubmitTwoFactor} className="flex flex-col gap-4">
        {serverError && <Alert variant="danger">{serverError}</Alert>}
        <p className="text-sm text-fg-muted">
          {useRecovery
            ? "Enter one of your saved recovery codes."
            : twoFactorMethod === "TOTP"
              ? "Enter the 6-digit code from your authenticator app."
              : "Enter the code we emailed you."}
        </p>

        {useRecovery ? (
          <InputField
            label="Recovery code"
            value={recoveryCode}
            onChange={(event) => setRecoveryCode(event.target.value)}
            autoFocus
          />
        ) : (
          <InputField
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoFocus
          />
        )}

        <Button type="submit" loading={submitting}>
          Verify
        </Button>
        <button
          type="button"
          className="text-center text-sm text-fg-subtle underline underline-offset-2 hover:text-fg-muted"
          onClick={() => setUseRecovery((value) => !value)}
        >
          {useRecovery ? "Use a verification code instead" : "Can't access your code? Use a recovery code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmitCredentials} className="flex flex-col gap-4" noValidate>
      {serverError && <Alert variant="danger">{serverError}</Alert>}

      <InputField
        label="CNIC or phone number"
        autoComplete="username"
        inputMode="numeric"
        placeholder="4210112345671"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        error={fieldErrors.identifier}
        autoFocus
      />

      <PasswordField
        label="Password"
        autoComplete="current-password"
        value={password}
        onValueChange={setPassword}
        error={fieldErrors.password}
      />

      <Button type="submit" loading={submitting}>
        Sign in
      </Button>

      <a
        href="/forgot-password"
        className="text-center text-sm text-fg-subtle underline underline-offset-2 hover:text-fg-muted"
      >
        Forgot your password?
      </a>
    </form>
  );
}
