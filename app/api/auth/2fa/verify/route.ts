import type { NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/validation";
import { twoFactorVerifySchema } from "@/lib/schemas/auth";
import { ApiError, handleApiError } from "@/lib/errors";
import { PENDING_2FA_COOKIE, verifyPending2FAToken, createSession } from "@/lib/auth/session";
import { setSessionCookies, clearPending2FACookie } from "@/lib/auth/cookies";
import { verifyTotpCode, verifyOtpCode, consumeRecoveryCode } from "@/lib/auth/two-factor";
import { decryptField } from "@/lib/crypto/encryption";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { otpRateLimiter, clientIp } from "@/lib/auth/rate-limit";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const pendingToken = req.cookies.get(PENDING_2FA_COOKIE)?.value;
    if (!pendingToken) {
      throw new ApiError(401, "Your sign-in attempt expired. Please log in again.", "NO_PENDING_LOGIN");
    }
    const userId = await verifyPending2FAToken(pendingToken);
    if (!userId) {
      throw new ApiError(401, "Your sign-in attempt expired. Please log in again.", "NO_PENDING_LOGIN");
    }

    const { success } = await otpRateLimiter.limit(`2fa:${userId}`);
    if (!success) {
      throw new ApiError(429, "Too many attempts. Try again in a few minutes.", "RATE_LIMITED");
    }

    const { code, recoveryCode } = await parseJsonBody(req, twoFactorVerifySchema);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE") {
      throw new ApiError(401, "Account not available.", "INVALID_ACCOUNT");
    }

    let verified = false;

    if (recoveryCode) {
      verified = await consumeRecoveryCode(userId, recoveryCode);
    } else if (code) {
      const methods = await prisma.twoFactorMethod.findMany({ where: { userId, enabled: true } });
      const totp = methods.find((m) => m.type === "TOTP");
      const emailOtp = methods.find((m) => m.type === "EMAIL_OTP");

      if (totp?.secret) {
        verified = verifyTotpCode(decryptField(totp.secret), code);
      } else if (emailOtp) {
        verified = await verifyOtpCode(userId, "LOGIN_2FA", code);
      }
    }

    if (!verified) {
      await logAudit({ actorId: userId, action: "LOGIN_FAILED", req, metadata: { stage: "2fa" } });
      throw new ApiError(401, "That code isn't valid.", "INVALID_2FA_CODE");
    }

    await clearPending2FACookie();
    const ip = clientIp(req);
    const { accessToken, refreshToken } = await createSession({
      userId: user.id,
      role: user.role,
      userAgent: req.headers.get("user-agent"),
      ip,
    });
    await setSessionCookies(accessToken, refreshToken);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await logAudit({ actorId: user.id, action: "LOGIN_SUCCESS", req, metadata: { via2fa: true } });

    return Response.json({
      user: { id: user.id, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
