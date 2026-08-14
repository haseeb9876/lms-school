"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { loginSchema } from "@/lib/schemas/auth";
import { InputField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [stage, setStage] = useState<"credentials" | "twoFactor">("credentials");
  const [twoFactorMethod, setTwoFactorMethod] = useState<"TOTP" | "EMAIL_OTP" | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmitCredentials(values: LoginValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
      router.push("/");
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
      router.push("/");
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
        <p className="text-sm text-neutral-600">
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
            onChange={(e) => setRecoveryCode(e.target.value)}
            autoFocus
          />
        ) : (
          <InputField
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
        )}
        <Button type="submit" loading={submitting}>
          Verify
        </Button>
        <button
          type="button"
          className="text-center text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
          onClick={() => setUseRecovery((v) => !v)}
        >
          {useRecovery ? "Use a verification code instead" : "Can't access your code? Use a recovery code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmitCredentials)} className="flex flex-col gap-4" noValidate>
      {serverError && <Alert variant="danger">{serverError}</Alert>}
      <InputField
        label="CNIC or phone number"
        autoComplete="username"
        error={errors.identifier?.message}
        {...register("identifier")}
      />
      <InputField
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" loading={submitting}>
        Sign in
      </Button>
      <a href="/forgot-password" className="text-center text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-700">
        Forgot your password?
      </a>
    </form>
  );
}
