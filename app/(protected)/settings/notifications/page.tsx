import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth/current-user";
import { getNotificationPreferences } from "@/lib/notifications";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationSettingsForm } from "@/components/settings/NotificationSettingsForm";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationSettingsPage() {
  const session = await requireAuth();
  const preferences = await getNotificationPreferences(session.userId);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Choose what reaches you, and whether it makes a sound."
      />
      <NotificationSettingsForm initial={preferences} />
    </div>
  );
}
