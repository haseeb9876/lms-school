import type { NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/validation";
import { loginSchema } from "@/lib/schemas/auth";
import { ApiError, handleApiError } from "@/lib/errors";
import { findUserByIdentifier } from "@/lib/auth/lookup";
import { verifyPassword } from "@/lib/crypto/passwords";
import { createSession, signPending2FAToken } from "@/lib/auth/session";
import { setSessionCookies, setPending2FACookie } from "@/lib/auth/cookies";
import { issueOtpCode } from "@/lib/auth/two-factor";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { loginRateLimiter, clientIp } from "@/lib/auth/rate-limit";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const ip = clientIp(req);
    const { success } = await loginRateLimiter.limit(`login:${ip}`);
    if (!success) {
      throw new ApiError(429, "Too many login attempts. Try again in a few minutes.", "RATE_LIMITED");
    }

    const { identifier, password } = await parseJsonBody(req, loginSchema);

    const user = await findUserByIdentifier(identifier);
    const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      await logAudit({ action: "LOGIN_FAILED", req, metadata: { identifierProvided: true } });
      throw new ApiError(401, "Incorrect CNIC/phone or password.", "INVALID_CREDENTIALS");
    }

    if (user.status !== "ACTIVE") {
      await logAudit({ actorId: user.id, action: "LOGIN_FAILED", req, metadata: { reason: "suspended" } });
      throw new ApiError(403, "This account has been suspended. Contact the school administrator.", "ACCOUNT_SUSPENDED");
    }

    if (user.twoFactorEnabled) {
      const methods = await prisma.twoFactorMethod.findMany({ where: { userId: user.id, enabled: true } });
      const hasTotp = methods.some((m) => m.type === "TOTP");
      const hasEmailOtp = methods.some((m) => m.type === "EMAIL_OTP");

      const pendingToken = await signPending2FAToken(user.id);
      await setPending2FACookie(pendingToken);

      if (!hasTotp && hasEmailOtp && user.email) {
        const code = await issueOtpCode(user.id, "LOGIN_2FA");
        await sendEmail({
          to: user.email,
          subject: "Your login verification code",
          html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
          text: `Your verification code is ${code}. It expires in 10 minutes.`,
        });
      }

      return Response.json({
        twoFactorRequired: true,
        method: hasTotp ? "TOTP" : "EMAIL_OTP",
      });
    }

    const { accessToken, refreshToken } = await createSession({
      userId: user.id,
      role: user.role,
      userAgent: req.headers.get("user-agent"),
      ip,
    });
    await setSessionCookies(accessToken, refreshToken);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await logAudit({ actorId: user.id, action: "LOGIN_SUCCESS", req });

    return Response.json({
      user: { id: user.id, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
