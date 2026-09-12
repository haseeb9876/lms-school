import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

export const metadata: Metadata = { title: "No access" };

export default function UnauthorizedPage() {
  return (
    <ErrorScreen
      icon={ShieldAlert}
      tone="warning"
      title="You don't have access to this page"
      description="Your account isn't assigned to this class, student or section. Access is set by the school principal — if you believe you should have it, ask them to update your assignments."
      actions={[
        { label: "Go to dashboard", href: "/dashboard" },
        { label: "Raise a help desk ticket", href: "/helpdesk", variant: "secondary" },
      ]}
      footer="This attempt has been recorded, as every access check in the portal is."
    />
  );
}
