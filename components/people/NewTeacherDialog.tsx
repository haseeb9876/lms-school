"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createTeacher } from "@/lib/actions/people";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { InputField } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { CredentialHandover, type Credential } from "./CredentialHandover";

export function NewTeacherButton({ suggestedEmployeeId }: { suggestedEmployeeId: string }) {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [issued, setIssued] = useState<Credential[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function close() {
    setOpen(false);
    setFieldErrors({});
    setIssued(null);
    if (issued) router.refresh();
  }

  function handleSubmit(formData: FormData) {
    setFieldErrors({});
    const value = (key: string) => String(formData.get(key) ?? "");

    startTransition(async () => {
      const result = await createTeacher({
        name: value("name"),
        cnic: value("cnic"),
        employeeId: value("employeeId"),
        qualification: value("qualification"),
        email: value("email"),
        phone: value("phone"),
      });

      if (result.ok) {
        toast.success(result.message ?? "Teacher added.");
        setIssued([
          {
            label: `${value("name")} — teacher`,
            cnic: result.data.credentials.cnic,
            password: result.data.credentials.password,
          },
        ]);
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Add teacher
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title={issued ? "Teacher added" : "Add a teacher"}
        description={
          issued
            ? "Hand these sign-in details to the new member of staff."
            : "Creates a staff account. Assign subjects and classes afterwards."
        }
        size="md"
        footer={
          issued ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={close} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" form="new-teacher" loading={isPending}>
                Add teacher
              </Button>
            </>
          )
        }
      >
        {issued ? (
          <CredentialHandover credentials={issued} />
        ) : (
          <form id="new-teacher" action={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField name="name" label="Full name" required error={fieldErrors.name} />
              <InputField
                name="cnic"
                label="CNIC"
                required
                inputMode="numeric"
                placeholder="4210112345671"
                hint="13 digits — dashes are fine."
                error={fieldErrors.cnic}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                name="employeeId"
                label="Employee ID"
                required
                // Pre-filled with the next free number so the common case is
                // one less thing to decide, while staying editable.
                defaultValue={suggestedEmployeeId}
                error={fieldErrors.employeeId}
              />
              <InputField
                name="qualification"
                label="Qualification"
                placeholder="M.Sc. Mathematics"
                error={fieldErrors.qualification}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                name="email"
                label="Email"
                type="email"
                hint="Optional — enables password reset."
                error={fieldErrors.email}
              />
              <InputField
                name="phone"
                label="Phone"
                type="tel"
                placeholder="03001234567"
                error={fieldErrors.phone}
              />
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
