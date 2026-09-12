"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Volume2 } from "lucide-react";
import { updateNotificationPreferences } from "@/lib/actions/notification-settings";
import { playNotificationChime } from "@/lib/notification-sound";
import type { NotificationPreferences } from "@/lib/notifications";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

interface Topic {
  key: keyof NotificationPreferences;
  label: string;
  hint: string;
  roles?: string[];
}

const TOPICS: Topic[] = [
  { key: "announcements", label: "Announcements", hint: "Notices from the school office and your teachers." },
  { key: "grades", label: "Results", hint: "When an exam result or a mark is published." },
  { key: "assignments", label: "Assignments", hint: "New work set, and marks returned." },
  { key: "attendance", label: "Attendance", hint: "Absences and attendance concerns." },
  { key: "fees", label: "Fees", hint: "New invoices and payments received." },
  { key: "deskTickets", label: "Messages to the office", hint: "Replies to something you raised." },
];

export function NotificationSettingsForm({ initial }: { initial: NotificationPreferences }) {
  const [values, setValues] = useState<NotificationPreferences>(initial);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function set(key: keyof NotificationPreferences, value: boolean) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await updateNotificationPreferences(values);
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const dirty = (Object.keys(values) as (keyof NotificationPreferences)[]).some(
    (key) => values[key] !== initial[key]
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Bell className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
            Alerts
          </h2>

          <Checkbox
            label="Notify me in the app"
            hint="Turning this off silences everything below as well."
            checked={values.enabled}
            onChange={(event) => set("enabled", event.target.checked)}
          />

          <div className={cn("flex flex-col gap-3", !values.enabled && "pointer-events-none opacity-50")}>
            <Checkbox
              label="Play a sound"
              hint="A short chime when something arrives while the app is open."
              checked={values.soundEnabled}
              disabled={!values.enabled}
              onChange={(event) => set("soundEnabled", event.target.checked)}
            />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              disabled={!values.enabled || !values.soundEnabled}
              // Lets someone check the volume without waiting for a real
              // notification, and doubles as the gesture browsers require
              // before they will play audio at all.
              onClick={() => void playNotificationChime()}
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              Play test sound
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-fg">What to tell me about</h2>
            <p className="mt-0.5 text-sm text-fg-subtle">
              Muted topics stop arriving — they aren&apos;t hidden and then revealed later.
            </p>
          </div>

          <div className={cn("flex flex-col gap-3", !values.enabled && "pointer-events-none opacity-50")}>
            {TOPICS.map((topic) => (
              <Checkbox
                key={topic.key}
                label={topic.label}
                hint={topic.hint}
                checked={Boolean(values[topic.key])}
                disabled={!values.enabled}
                onChange={(event) => set(topic.key, event.target.checked)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} loading={isPending} disabled={!dirty} className="self-start">
        Save settings
      </Button>
    </div>
  );
}
