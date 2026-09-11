"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { withAction } from "./with-action";
import { actionOk } from "./types";

/**
 * Scoped with `userId: ctx.user.id` in the *where* clause rather than
 * checking ownership after loading the row. A notification id belonging to
 * someone else simply matches nothing, so there's no path where a guessed
 * id marks another person's notification as read.
 */
export const markNotificationRead = withAction(
  { roles: null, input: z.object({ id: z.string().min(1) }) },
  async (input, ctx) => {
    await prisma.notification.updateMany({
      where: { id: input.id, userId: ctx.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    revalidatePath("/", "layout");
    return actionOk();
  }
);

export const markAllNotificationsRead = withAction({ roles: null }, async (_input, ctx) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId: ctx.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
  return actionOk({ count }, count > 0 ? `Marked ${count} as read.` : "Nothing to mark.");
});
