"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/crypto/passwords";
import { checkPassword } from "@/lib/password-policy";
import { createSession, revokeAllSessionsForUser } from "@/lib/auth/session";
import { setSessionCookies } from "@/lib/auth/cookies";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(1, "Enter a new password."),
});

export const changePassword = withAction(
  { roles: null, input: changePasswordSchema },
  async (input, ctx) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { id: true, role: true, passwordHash: true },
    });

    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      return actionError("Your current password is incorrect.", {
        code: "INVALID_CURRENT_PASSWORD",
        fieldErrors: { currentPassword: "That's not your current password." },
      });
    }

    /*
     * Validated against the same rules the form's checklist is rendered
     * from, and the failure is attached to the field rather than returned as
     * a bare message — a rejected password with no visible explanation is
     * precisely the bug this replaced.
     */
    const check = checkPassword(input.newPassword);
    if (!check.valid) {
      return actionError(check.reason ?? "That password doesn't meet the requirements.", {
        code: "WEAK_PASSWORD",
        fieldErrors: { newPassword: check.reason ?? "Doesn't meet the requirements." },
      });
    }

    if (input.newPassword === input.currentPassword) {
      return actionError("Choose a password you haven't used before.", {
        code: "PASSWORD_UNCHANGED",
        fieldErrors: { newPassword: "This is your current password." },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword), mustChangePassword: false },
    });

    /*
     * Changing a password ends every existing session — that is the point of
     * changing it after a suspected compromise. A fresh session is issued
     * immediately afterwards so the person doing it isn't signed out by
     * their own action.
     */
    await revokeAllSessionsForUser(user.id);

    const headerList = await headers();
    const { accessToken, refreshToken } = await createSession({
      userId: user.id,
      role: user.role,
      userAgent: headerList.get("user-agent"),
      ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    await setSessionCookies(accessToken, refreshToken);

    await logAudit({ actorId: user.id, action: "PASSWORD_CHANGED" });

    revalidatePath("/settings/security");
    return actionOk(undefined, "Password changed. Other devices have been signed out.");
  }
);
