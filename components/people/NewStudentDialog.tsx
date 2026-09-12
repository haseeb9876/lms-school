"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createStudent } from "@/lib/actions/people";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { TextareaField } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { CredentialHandover, type Credential } from "./CredentialHandover";

const RELATIONSHIPS = [
  { value: "FATHER", label: "Father" },
  { value: "MOTHER", label: "Mother" },
  { value: "GUARDIAN", label: "Guardian" },
];

const GENDERS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

export function NewStudentButton({ sections }: { sections: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Once the account exists, the dialog becomes the handover screen — the
  // password can't be shown again, so it must not be one toast away.
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
      const result = await createStudent({
        name: value("name"),
        cnic: value("cnic"),
        sectionId: value("sectionId"),
        rollNumber: value("rollNumber"),
        dateOfBirth: value("dateOfBirth"),
        gender: value("gender") as "Male",
        address: value("address"),
        email: value("email"),
        guardianName: value("guardianName"),
        guardianCnic: value("guardianCnic"),
        guardianPhone: value("guardianPhone"),
        guardianRelationship: value("guardianRelationship") as "FATHER",
      });

      if (result.ok) {
        toast.success(result.message ?? "Student enrolled.");
        const credentials: Credential[] = [
          {
            label: `${value("name")} — student`,
            cnic: result.data.credentials.student.cnic,
            password: result.data.credentials.student.password,
          },
        ];
        if (result.data.credentials.guardian) {
          credentials.push({
            label: `${value("guardianName")} — guardian`,
            cnic: result.data.credentials.guardian.cnic,
            password: result.data.credentials.guardian.password,
          });
        }
        setIssued(credentials);
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  const disabled = sections.length === 0;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Add student
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title={issued ? "Student enrolled" : "Enrol a student"}
        description={
          issued
            ? "Hand these sign-in details to the student and their guardian."
            : "Creates the student's account and links a guardian who can see their record."
        }
        size="lg"
        footer={
          issued ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={close} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" form="new-student" loading={isPending}>
                Enrol student
              </Button>
            </>
          )
        }
      >
        {issued ? (
          <CredentialHandover credentials={issued} />
        ) : (
          <form id="new-student" action={handleSubmit} className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-4">
              <legend className="text-sm font-semibold text-fg">Student</legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField name="name" label="Full name" required error={fieldErrors.name} />
                <InputField
                  name="cnic"
                  label="CNIC / B-Form"
                  required
                  inputMode="numeric"
                  placeholder="4210112345671"
                  hint="13 digits — dashes are fine."
                  error={fieldErrors.cnic}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <SelectField
                  name="sectionId"
                  label="Class"
                  required
                  options={sections}
                  placeholder="Choose a class"
                  error={fieldErrors.sectionId}
                />
                <InputField
                  name="rollNumber"
                  label="Roll number"
                  inputMode="numeric"
                  error={fieldErrors.rollNumber}
                />
                <SelectField
                  name="gender"
                  label="Gender"
                  options={GENDERS}
                  placeholder="Not specified"
                  error={fieldErrors.gender}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  name="dateOfBirth"
                  label="Date of birth"
                  type="date"
                  error={fieldErrors.dateOfBirth}
                />
                <InputField
                  name="email"
                  label="Email"
                  type="email"
                  hint="Optional — enables password reset."
                  error={fieldErrors.email}
                />
              </div>

              <TextareaField name="address" label="Address" rows={2} error={fieldErrors.address} />
            </fieldset>

            <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
              <legend className="text-sm font-semibold text-fg">Guardian</legend>
              <p className="-mt-2 text-xs text-fg-subtle">
                If this guardian already has an account, it will be linked rather than duplicated —
                siblings share one login.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  name="guardianName"
                  label="Guardian name"
                  required
                  error={fieldErrors.guardianName}
                />
                <InputField
                  name="guardianCnic"
                  label="Guardian CNIC"
                  required
                  inputMode="numeric"
                  error={fieldErrors.guardianCnic}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  name="guardianRelationship"
                  label="Relationship"
                  required
                  defaultValue="FATHER"
                  options={RELATIONSHIPS}
                  error={fieldErrors.guardianRelationship}
                />
                <InputField
                  name="guardianPhone"
                  label="Guardian phone"
                  type="tel"
                  placeholder="03001234567"
                  error={fieldErrors.guardianPhone}
                />
              </div>
            </fieldset>
          </form>
        )}
      </Dialog>
    </>
  );
}
