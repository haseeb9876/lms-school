"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { passwordChangeSchema } from "@/lib/schemas/auth";
import { InputField } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent } from "@/components/ui/Card";

type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

export function PasswordChangeForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeValues>({ resolver: zodResolver(passwordChangeSchema) });

  async function onSubmit(values: PasswordChangeValues) {
    setServerError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong.");
        return;
      }
      setSuccessMessage("Password changed. You're still signed in on this device.");
      reset();
    } catch {
      setServerError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Change password</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {serverError && <Alert variant="danger">{serverError}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
          <InputField
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <InputField
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 10 characters."
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <Button type="submit" loading={submitting} className="self-start">
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
