"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { revokeSessionChain } from "@/lib/auth/session";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

/**
 * Signs one device out, from another device.
 *
 * This is the counterpart to phone sessions never expiring. A session that
 * lasts until someone taps Log out is only safe if there is a way to end it
 * when they *can't* — the phone was lost, or left with a family member, or
 * the teacher has left the school. Without this, "no timeout" would mean
 * "no way back".
 */
export const revokeDevice = withAction(
  { roles: null, input: z.object({ chainId: z.string().min(1) }) },
  async (input, ctx) => {
    // Scoped to the acting user inside revokeSessionChain, so a guessed or
    // forged chain id can only ever end one of your own sessions.
    const ended = await revokeSessionChain(ctx.user.id, input.chainId);

    if (ended === 0) {
      return actionError("That device is already signed out.", { code: "NOT_FOUND" });
    }

    await logAudit({
      actorId: ctx.user.id,
      action: "LOGOUT",
      targetType: "Session",
      targetId: input.chainId,
      metadata: { revokedFromAnotherDevice: true, sessionsEnded: ended },
    });

    revalidatePath("/settings/security");
    return actionOk(undefined, "That device has been signed out.");
  }
);

/**
 * Ends every session except the one making the request — the "I think
 * someone else is in my account" button. The current device is spared so
 * the person isn't thrown out of the page they're trying to secure.
 */
export const revokeOtherDevices = withAction({ roles: null }, async (_input: void, ctx) => {
  /*
   * Spare this browser's whole chain, not just its newest row. The session
   * id in the token is the current rotation; the chain it belongs to is
   * what the device list treats as "this device". Excluding only the row
   * would be harmless here (older rotations are already revoked) but would
   * break the moment a rotation lands between this read and the write.
   */
  const current = await prisma.session.findUnique({
    where: { id: ctx.session.sessionId },
    select: { chainId: true },
  });
  const currentChain = current?.chainId ?? ctx.session.sessionId;

  const result = await prisma.session.updateMany({
    where: {
      userId: ctx.user.id,
      revokedAt: null,
      NOT: { OR: [{ chainId: currentChain }, { id: currentChain }] },
    },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) {
    return actionOk(undefined, "You're not signed in anywhere else.");
  }

  await logAudit({
    actorId: ctx.user.id,
    action: "LOGOUT",
    metadata: { signedOutEverywhereElse: true, sessionsEnded: result.count },
  });

  revalidatePath("/settings/security");
  return actionOk(undefined, "Signed out of every other device.");
});
