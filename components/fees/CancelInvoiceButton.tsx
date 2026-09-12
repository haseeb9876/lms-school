"use client";

import { Ban } from "lucide-react";
import { cancelInvoice } from "@/lib/actions/fees";
import { ConfirmAction } from "@/components/ui/ConfirmAction";

/**
 * Cancels an invoice raised in error.
 *
 * Only offered while nothing has been paid against it — the action refuses
 * otherwise, since cancelling an invoice money has been taken against would
 * strand that payment. A reason is required because "why was this family
 * not billed" is exactly the question an audit asks later.
 */
export function CancelInvoiceButton({
  invoiceId,
  invoiceNumber,
  studentName,
}: {
  invoiceId: string;
  invoiceNumber: string;
  studentName: string;
}) {
  return (
    <ConfirmAction
      trigger={{ label: "Cancel invoice", icon: Ban, variant: "ghost" }}
      title="Cancel this invoice?"
      confirmLabel="Cancel invoice"
      reason={{ label: "Reason", placeholder: "Issued in error — duplicate of INV-2026-00123" }}
      body={
        <>
          Invoice <span className="font-medium text-fg">{invoiceNumber}</span> for{" "}
          <span className="font-medium text-fg">{studentName}</span> will be marked cancelled and
          will stop counting towards outstanding fees.
        </>
      }
      action={(reason) => cancelInvoice({ invoiceId, reason })}
    />
  );
}
