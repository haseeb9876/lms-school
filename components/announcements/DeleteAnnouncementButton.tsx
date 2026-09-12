"use client";

import { Trash2 } from "lucide-react";
import { deleteAnnouncement } from "@/lib/actions/announcements";
import { ConfirmAction } from "@/components/ui/ConfirmAction";

export function DeleteAnnouncementButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmAction
      trigger={{ label: "Remove", icon: Trash2, variant: "ghost", size: "xs" }}
      title="Remove this announcement?"
      confirmLabel="Remove"
      body={
        <>
          <span className="font-medium text-fg">{title}</span> will no longer appear for anyone.
          Notifications already sent about it are not recalled.
        </>
      }
      action={() => deleteAnnouncement({ id })}
    />
  );
}
