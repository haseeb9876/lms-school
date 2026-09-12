"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { generateTempPassword } from "@/lib/crypto/temp-password";
import { decryptField } from "@/lib/crypto/encryption";
import { checkPassword } from "@/lib/password-policy";
import { resetAccountPassword } from "@/lib/password-reset";
import { findAccountByCnic, type RecoveryMatch } from "@/lib/queries/account-recovery";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

/**
 * The office counter.
 *
 * Somebody walks in and says they cannot sign in. There is no email to send
 * a link to — students and guardians here are issued credentials at the
 * office and most have no email address at all — so the recovery path for
 * almost everyone in this school is a person standing at a desk. This
 * module is that path, made deliberate instead of improvised.
 *
 * The shape of the risk is worth stating plainly, because it decides the
 * design. A CNIC is not a secret: it is printed on a card, written on
 * admission forms, known to relatives and to anyone who has handled the
 * paperwork. So "knows the CNIC" must never be sufficient to take over an
 * account. What actually protects these accounts is that the principal is
 * looking at the person. Everything here exists to make that judgement
 * informed and to record that it was made:
 *
 *   - the lookup returns facts the principal can check out loud (class,
 *     admission number, father's name) rather than just a name and a button;
 *   - the reset requires an explicit confirmation that identity was
 *     verified, and that confirmation is written to the audit log with the
 *     principal's own id against it;
 *   - both the search and the reset are logged, so a pattern of lookups
 *     against accounts nobody asked about is visible afterwards.
 */

const cnicLookupSchema = z.object({
  identifier: z.string().trim().min(1, "Enter the CNIC number."),
});

export const lookupAccountForRecovery = withAction(
  { roles: ["PRINCIPAL"], input: cnicLookupSchema },
  async (input, ctx) => {
    const match = await findAccountByCnic(input.identifier);

    /*
     * Logged whether or not anything was found. A search that returns
     * nothing is the more interesting one to be able to review later: a run
     * of them is what probing for valid CNICs looks like.
     */
    await logAudit({
      actorId: ctx.user.id,
      action: "STUDENT_PII_VIEWED",
      targetType: "User",
      targetId: match?.id,
      // The CNIC searched for is deliberately not recorded — writing the
      // number into a second table in plaintext would undo the point of
      // encrypting the column it was matched against.
      metadata: { via: "recovery-desk", found: Boolean(match) },
    });

    if (!match) {
      return actionError(
        "No account has that CNIC. Check the number, or search the student and staff lists by name.",
        { code: "NOT_FOUND", fieldErrors: { identifier: "No account found for this CNIC." } }
      );
    }

    return actionOk<RecoveryMatch>(match);
  }
);

/** Shared by both handover modes. */
const baseResetSchema = z.object({
  userId: z.string().min(1),
  /**
   * Not a checkbox for its own sake. It is the one part of this process a
   * computer cannot do, and recording it turns "the system let them" into
   * "a named person said they checked".
   */
  identityVerified: z.literal(true, {
    message: "Confirm you have verified who this person is.",
  }),
});

const counterPasswordSchema = baseResetSchema.extend({
  password: z.string().min(1, "Enter the new password."),
  confirmPassword: z.string().min(1, "Type the password again."),
});

/**
 * The person is at the counter and types their own new password.
 *
 * This is the mode to prefer, and not only because it is what was asked
 * for. A password the office generates is a password two people know, and
 * the one who did not choose it is the one who has to remember it — which
 * is how a slip of paper ends up in a school bag with a working login on
 * it. When someone picks their own, nobody else ever sees it, there is
 * nothing to write down, and they can walk out and sign in immediately.
 *
 * Because they chose it themselves, `mustChangePassword` is not set: there
 * is nothing to force a change away from.
 */
export const setPasswordAtCounter = withAction(
  { roles: ["PRINCIPAL"], input: counterPasswordSchema },
  async (input, ctx) => {
    if (input.password !== input.confirmPassword) {
      return actionError("The two passwords don't match.", {
        code: "MISMATCH",
        fieldErrors: { confirmPassword: "This doesn't match the password above." },
      });
    }

    const policy = checkPassword(input.password);
    if (!policy.valid) {
      const reason = policy.reason ?? "Choose a stronger password.";
      return actionError(reason, { code: "WEAK_PASSWORD", fieldErrors: { password: reason } });
    }

    const target = await loadTarget(input.userId, ctx.user.id);
    if (!target.ok) return target.error;
    const user = target.user;

    const outcome = await resetAccountPassword(user.id, input.password, { mustChange: false });

    await logAudit({
      actorId: ctx.user.id,
      action: "PASSWORD_RESET_COMPLETED",
      targetType: "User",
      targetId: user.id,
      metadata: {
        via: "recovery-desk",
        method: "chosen-at-counter",
        identityVerified: true,
        role: user.role,
        sessionsEnded: outcome.sessionsEnded,
        resetLinksVoided: outcome.resetLinksVoided,
      },
    });

    revalidatePath("/principal/recovery");
    return actionOk(
      { name: user.name, cnic: decryptField(user.cnic) },
      `${user.name} can sign in now with the password they just chose.`
    );
  }
);

/**
 * The person is not present — a phone call, or a parent sending a request
 * through a child — so the office issues a temporary password to hand over.
 *
 * Weaker than the counter mode by nature: for a moment the password exists
 * outside the account holder's head. `mustChangePassword` is set so that
 * moment ends at their next sign-in.
 */
export const issueTemporaryPassword = withAction(
  { roles: ["PRINCIPAL"], input: baseResetSchema },
  async (input, ctx) => {
    const target = await loadTarget(input.userId, ctx.user.id);
    if (!target.ok) return target.error;
    const user = target.user;

    const password = generateTempPassword();
    const outcome = await resetAccountPassword(user.id, password, { mustChange: true });

    await logAudit({
      actorId: ctx.user.id,
      action: "PASSWORD_RESET_COMPLETED",
      targetType: "User",
      targetId: user.id,
      // The password itself is never recorded, here or anywhere.
      metadata: {
        via: "recovery-desk",
        method: "temporary-issued",
        identityVerified: true,
        role: user.role,
        sessionsEnded: outcome.sessionsEnded,
        resetLinksVoided: outcome.resetLinksVoided,
      },
    });

    revalidatePath("/principal/recovery");
    return actionOk(
      { name: user.name, cnic: decryptField(user.cnic), password },
      `Temporary password issued for ${user.name}.`
    );
  }
);

interface TargetUser {
  id: string;
  name: string;
  role: "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT";
  cnic: string;
}

type TargetLookup =
  | { ok: true; user: TargetUser }
  | { ok: false; error: ReturnType<typeof actionError> };

async function loadTarget(userId: string, actorId: string): Promise<TargetLookup> {
  if (userId === actorId) {
    return {
      ok: false,
      error: actionError(
        "Use Account Security to change your own password — the desk is for other people's accounts.",
        { code: "SELF_RESET" }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, cnic: true, status: true },
  });

  if (!user) {
    return { ok: false, error: actionError("That account no longer exists.", { code: "NOT_FOUND" }) };
  }

  /*
   * A suspended account is refused rather than quietly reset. Issuing a
   * working password to someone who still cannot sign in produces a person
   * who believes the office fixed their problem and comes back angry; and
   * if the suspension is later lifted, that password is live without anyone
   * deciding it should be.
   */
  if (user.status !== "ACTIVE") {
    return {
      ok: false,
      error: actionError(
        `${user.name}'s account is suspended. Restore the account first — a new password won't let them in while it is.`,
        { code: "ACCOUNT_SUSPENDED" }
      ),
    };
  }

  return { ok: true, user };
}

