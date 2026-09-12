"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeTeacherAssignment } from "@/lib/actions/academics";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

/**
 * Removing an assignment revokes a teacher's access to a class's registers
 * and marks, so it asks first. The confirmation names the specific pairing
 * rather than saying "are you sure?" — the thing worth checking is whether
 * this is the right row.
 */
export function RemoveAssignmentButton({
  assignmentId,
  teacherName,
  subjectName,
  sectionLabel,
}: {
  assignmentId: string;
  teacherName: string;
  subjectName: string;
  sectionLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function remove() {
    startTransition(async () => {
      const result = await removeTeacherAssignment({ id: assignmentId });
      if (result.ok) {
        toast.success(result.message ?? "Assignment removed.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Remove ${teacherName} from ${subjectName} in ${sectionLabel}`}
        className="rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Remove this assignment?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={isPending}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          <span className="font-medium text-fg">{teacherName}</span> will no longer teach{" "}
          <span className="font-medium text-fg">{subjectName}</span> to{" "}
          <span className="font-medium text-fg">{sectionLabel}</span>, and will lose access to that
          class&apos;s register and marks.
        </p>
      </Dialog>
    </>
  );
}
