import type { StudentStatus } from "@prisma/client";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";

const VARIANTS: Record<StudentStatus, { variant: BadgeVariant; label: string }> = {
  ACTIVE: { variant: "success", label: "Active" },
  GRADUATED: { variant: "info", label: "Graduated" },
  WITHDRAWN: { variant: "neutral", label: "Withdrawn" },
  TRANSFERRED: { variant: "warning", label: "Transferred" },
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { variant, label } = VARIANTS[status];
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}
