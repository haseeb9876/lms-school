"use client";

import { useRef, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { changePassword } from "@/lib/actions/account";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { checkPassword } from "@/lib/password-policy";

/**
 * Uses the app's own Server Action pattern rather than react-hook-form.
 *
 * The previous version used zodResolver from @hookform/resolvers v3 against
 * Zod v4. That combination *throws* the validation error instead of
 * returning it, and react-hook-form doesn't catch it — so submitting a
 * too-short password did nothing at all: no request, no message, no clue.
 * Both packages are gone; every form in this app now submits the same way.
 */
export function PasswordChangeForm() {
  const [newPassword, setNewPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  const ready = checkPassword(newPassword).valid;

  function handleSubmit(formData: FormData) {
    setFieldErrors({});
    setSuccess(null);

    startTransition(async () => {
      const result = await changePassword({
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword: String(formData.get("newPassword") ?? ""),
      });

      if (result.ok) {
        formRef.current?.reset();
        setNewPassword("");
        setSuccess(result.message ?? "Password changed.");
        toast.success(result.message ?? "Password changed.");
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent>
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-fg">
          <KeyRound className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
          Change password
        </h2>
        <p className="mb-4 text-sm text-fg-subtle">
          Changing your password signs you out everywhere else.
        </p>

        <form ref={formRef} action={handleSubmit} className="flex max-w-md flex-col gap-4">
          {success && <Alert variant="success">{success}</Alert>}

          <PasswordField
            name="currentPassword"
            label="Current password"
            autoComplete="current-password"
            required
            error={fieldErrors.currentPassword}
          />

          <PasswordField
            name="newPassword"
            label="New password"
            autoComplete="new-password"
            required
            showRequirements
            value={newPassword}
            onValueChange={setNewPassword}
            error={fieldErrors.newPassword}
          />

          <Button
            type="submit"
            loading={isPending}
            // Disabled only once something has been typed — an untouched
            // form shouldn't present a dead button with no explanation.
            disabled={newPassword.length > 0 && !ready}
            className="self-start"
          >
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
