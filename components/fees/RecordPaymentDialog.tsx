"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote } from "lucide-react";
import { recordPayment } from "@/lib/actions/fees";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { InputField } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { TextareaField } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/format";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "OTHER", label: "Other" },
];

export function RecordPaymentButton({
  invoiceId,
  balance,
}: {
  invoiceId: string;
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function handleSubmit(formData: FormData) {
    setFieldErrors({});

    startTransition(async () => {
      const result = await recordPayment({
        invoiceId,
        amountPaid: Number(formData.get("amountPaid") ?? 0),
        paymentMethod: String(formData.get("paymentMethod") ?? "CASH") as "CASH",
        notes: String(formData.get("notes") ?? ""),
      });

      if (result.ok) {
        toast.success(result.message ?? "Payment recorded.");
        setOpen(false);
        router.refresh();
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  if (balance <= 0) return null;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Banknote className="h-4 w-4" aria-hidden="true" />
        Record payment
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Record a payment"
        description={`Outstanding balance: ${formatCurrency(balance)}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" form="record-payment" loading={isPending}>
              Record payment
            </Button>
          </>
        }
      >
        <form id="record-payment" action={handleSubmit} className="flex flex-col gap-4">
          <InputField
            name="amountPaid"
            label="Amount received"
            type="number"
            min={1}
            max={balance}
            step="1"
            required
            // Defaulting to the full balance matches the common case — most
            // families pay the whole invoice at the counter.
            defaultValue={balance}
            hint={`Maximum ${formatCurrency(balance)}`}
            error={fieldErrors.amountPaid}
          />

          <SelectField
            name="paymentMethod"
            label="Payment method"
            required
            defaultValue="CASH"
            options={METHODS}
            error={fieldErrors.paymentMethod}
          />

          <TextareaField
            name="notes"
            label="Notes"
            rows={3}
            hint="Optional — cheque number, transaction reference."
            error={fieldErrors.notes}
          />
        </form>
      </Dialog>
    </>
  );
}
