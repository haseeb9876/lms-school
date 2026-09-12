import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto/passwords";

/**
 * Everything that must happen when an account's password is replaced.
 *
 * Deliberately *not* in a "use server" module. Every export of one of those
 * becomes a Server Action the browser can call by id, so a helper living
 * there would be an unauthenticated password-reset endpoint — which is
 * precisely what `scripts/check-auth-coverage.ts` exists to prevent. Keeping
 * the mechanism here and the authorization in the action that calls it also
 * makes this directly testable, without having to forge a request context.
 */
export interface PasswordResetOutcome {
  sessionsEnded: number;
  resetLinksVoided: number;
}

export async function resetAccountPassword(
  userId: string,
  password: string,
  opts: { mustChange: boolean }
): Promise<PasswordResetOutcome> {
  const passwordHash = await hashPassword(password);
  const now = new Date();

  /*
   * One transaction, because these three writes are only correct together:
   *
   *  - a new password that leaves a live session alone has locked nobody
   *    out, so an attacker who is already signed in stays signed in;
   *  - one that leaves an emailed reset link valid can be undone by whoever
   *    is holding that link, minutes later, without anyone noticing.
   *
   * Partially applying this set is worse than not applying it at all, since
   * the office would believe the account was secured.
   */
  const [, sessions, tokens] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: opts.mustChange },
    }),
    prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  return { sessionsEnded: sessions.count, resetLinksVoided: tokens.count };
}
