import type { AttendanceStatus } from "@prisma/client";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";

const VARIANTS: Record<AttendanceStatus, { variant: BadgeVariant; label: string }> = {
  PRESENT: { variant: "success", label: "Present" },
  ABSENT: { variant: "danger", label: "Absent" },
  LATE: { variant: "warning", label: "Late" },
  EXCUSED: { variant: "info", label: "Excused" },
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const { variant, label } = VARIANTS[status];
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}
