import type { NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/validation";
import { passwordResetRequestSchema } from "@/lib/schemas/auth";
import { handleApiError, ApiError } from "@/lib/errors";
import { findUserByIdentifier } from "@/lib/auth/lookup";
import { prisma } from "@/lib/db";
import { randomToken, sha256Hex } from "@/lib/crypto/hash";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { passwordResetRateLimiter, clientIp } from "@/lib/auth/rate-limit";

const RESET_TOKEN_TTL_MS = 45 * 60 * 1000;
// Deliberately generic — never confirm or deny whether an account/email exists.
const GENERIC_MESSAGE =
  "If we found a matching account with an email on file, a reset link has been sent to it. " +
  "If the account has no email on file, ask the school principal to reset your password.";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const ip = clientIp(req);
    const { success } = await passwordResetRateLimiter.limit(`reset:${ip}`);
    if (!success) {
      throw new ApiError(429, "Too many requests. Try again later.", "RATE_LIMITED");
    }

    const { identifier } = await parseJsonBody(req, passwordResetRequestSchema);
    const user = await findUserByIdentifier(identifier);

    if (user?.email) {
      const token = randomToken(32);
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256Hex(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: `<p>Click the link below to reset your password. This link expires in 45 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
        text: `Reset your password: ${resetUrl} (expires in 45 minutes)`,
      });

      await logAudit({ actorId: user.id, action: "PASSWORD_RESET_REQUESTED", req });
    }

    return Response.json({ message: GENERIC_MESSAGE });
  } catch (err) {
    return handleApiError(err);
  }
}
