"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { withAction } from "./with-action";
import { actionOk } from "./types";

const preferencesSchema = z.object({
  enabled: z.boolean(),
  soundEnabled: z.boolean(),
  announcements: z.boolean(),
  grades: z.boolean(),
  attendance: z.boolean(),
  fees: z.boolean(),
  assignments: z.boolean(),
  deskTickets: z.boolean(),
});

/**
 * Saves one person's notification preferences.
 *
 * Upserted rather than updated: a row only exists once someone has changed
 * something, because the alternative — creating a settings row for every
 * account up front — writes 15,000 rows to record that nobody has expressed
 * a preference yet.
 *
 * Always scoped to `ctx.user.id`. There is deliberately no way to pass a
 * user id, so this cannot be used to mute somebody else's alerts.
 */
export const updateNotificationPreferences = withAction(
  { roles: null, input: preferencesSchema },
  async (input, ctx) => {
    await prisma.notificationSetting.upsert({
      where: { userId: ctx.user.id },
      create: { userId: ctx.user.id, ...input },
      update: input,
    });

    revalidatePath("/settings/notifications");
    return actionOk(undefined, "Notification settings saved.");
  }
);
