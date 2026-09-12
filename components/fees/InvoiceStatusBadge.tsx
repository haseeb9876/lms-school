import type { InvoiceStatus } from "@prisma/client";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";

const VARIANTS: Record<InvoiceStatus, { variant: BadgeVariant; label: string }> = {
  PAID: { variant: "success", label: "Paid" },
  PENDING: { variant: "warning", label: "Pending" },
  PARTIAL: { variant: "info", label: "Part paid" },
  OVERDUE: { variant: "danger", label: "Overdue" },
  CANCELLED: { variant: "neutral", label: "Cancelled" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { variant, label } = VARIANTS[status];
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}
