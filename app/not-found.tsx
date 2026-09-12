import { Compass } from "lucide-react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function NotFound() {
  return (
    <ErrorScreen
      icon={Compass}
      tone="neutral"
      title="Page not found"
      description="This page doesn't exist, or the link that brought you here is out of date. It may also be a record that has since been removed."
      actions={[
        { label: "Go to dashboard", href: "/dashboard" },
        { label: "Back to welcome", href: "/", variant: "secondary" },
      ]}
    />
  );
}
