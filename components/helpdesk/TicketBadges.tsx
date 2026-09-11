import type { TicketPriority, TicketStatus } from "@prisma/client";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";

const STATUS: Record<TicketStatus, { variant: BadgeVariant; label: string }> = {
  OPEN: { variant: "warning", label: "Open" },
  IN_PROGRESS: { variant: "info", label: "In progress" },
  RESOLVED: { variant: "success", label: "Resolved" },
  CLOSED: { variant: "neutral", label: "Closed" },
};

const PRIORITY: Record<TicketPriority, { variant: BadgeVariant; label: string }> = {
  LOW: { variant: "neutral", label: "Low" },
  MEDIUM: { variant: "info", label: "Medium" },
  HIGH: { variant: "warning", label: "High" },
  URGENT: { variant: "danger", label: "Urgent" },
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { variant, label } = STATUS[status];
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const { variant, label } = PRIORITY[priority];
  return <Badge variant={variant}>{label}</Badge>;
}
