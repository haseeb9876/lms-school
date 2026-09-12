"use client";

import { Receipt, Settings2 } from "lucide-react";
import { createFeeStructure, generateInvoices } from "@/lib/actions/fee-setup";
import { FormDialog } from "@/components/ui/FormDialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import type { Option } from "@/components/academics/SetupDialogs";
import { todaySchoolDate } from "@/lib/format";

const FREQUENCIES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL", label: "Annual" },
  { value: "ONE_TIME", label: "One time" },
];

export function SetFeeButton({
  sections,
  categories,
}: {
  sections: Option[];
  categories: Option[];
}) {
  if (sections.length === 0 || categories.length === 0) return null;

  return (
    <FormDialog
      trigger={{ label: "Set class fee", icon: Settings2, variant: "secondary" }}
      title="Set a fee for a class"
      description="Defines what a class is charged. Invoices are issued from this."
      submitLabel="Save fee"
      formId="new-fee-structure"
      size="sm"
      action={(formData) =>
        createFeeStructure({
          sectionId: String(formData.get("sectionId") ?? ""),
          feeCategoryId: String(formData.get("feeCategoryId") ?? ""),
          amount: Number(formData.get("amount") ?? 0),
          frequency: String(formData.get("frequency") ?? "MONTHLY") as "MONTHLY",
          dueDayOfMonth: formData.get("dueDayOfMonth")
            ? Number(formData.get("dueDayOfMonth"))
            : undefined,
        })
      }
    >
      {(errors) => (
        <>
          <SelectField
            name="sectionId"
            label="Class"
            required
            options={sections}
            placeholder="Choose a class"
            error={errors.sectionId}
          />
          <SelectField
            name="feeCategoryId"
            label="Fee type"
            required
            options={categories}
            placeholder="Choose a fee type"
            error={errors.feeCategoryId}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              name="amount"
              label="Amount (PKR)"
              type="number"
              min={1}
              required
              error={errors.amount}
            />
            <SelectField
              name="frequency"
              label="Frequency"
              required
              defaultValue="MONTHLY"
              options={FREQUENCIES}
              error={errors.frequency}
            />
          </div>
          <InputField
            name="dueDayOfMonth"
            label="Due day of month"
            type="number"
            min={1}
            max={28}
            placeholder="10"
            hint="Capped at 28 so it exists in every month."
            error={errors.dueDayOfMonth}
          />
        </>
      )}
    </FormDialog>
  );
}

export function GenerateInvoicesButton({
  sections,
  terms,
}: {
  sections: Option[];
  terms: Option[];
}) {
  if (sections.length === 0) return null;

  return (
    <FormDialog
      trigger={{ label: "Issue invoices", icon: Receipt }}
      title="Issue invoices for a class"
      description="Creates one invoice per active student from that class's fee."
      submitLabel="Issue invoices"
      formId="generate-invoices"
      size="sm"
      action={(formData) =>
        generateInvoices({
          sectionId: String(formData.get("sectionId") ?? ""),
          termId: String(formData.get("termId") ?? ""),
          dueDate: String(formData.get("dueDate") ?? ""),
          note: String(formData.get("note") ?? ""),
        })
      }
    >
      {(errors) => (
        <>
          <Alert variant="info">
            Safe to run twice — a student who already has an invoice for this due date is skipped
            rather than billed again.
          </Alert>

          <SelectField
            name="sectionId"
            label="Class"
            required
            options={sections}
            placeholder="Choose a class"
            error={errors.sectionId}
          />
          <InputField
            name="dueDate"
            label="Due date"
            type="date"
            required
            defaultValue={todaySchoolDate()}
            error={errors.dueDate}
          />
          {terms.length > 0 && (
            <SelectField
              name="termId"
              label="Term"
              options={terms}
              placeholder="Not term-specific"
              error={errors.termId}
            />
          )}
          <InputField
            name="note"
            label="Billing period"
            placeholder="October 2026"
            hint="Optional — shown to guardians in the notification."
            error={errors.note}
          />
        </>
      )}
    </FormDialog>
  );
}
