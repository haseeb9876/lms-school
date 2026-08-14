import type { NextRequest } from "next/server";
import { parseJsonBody } from "@/lib/validation";
import { passwordResetConfirmSchema } from "@/lib/schemas/auth";
import { handleApiError, ApiError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { sha256Hex } from "@/lib/crypto/hash";
import { hashPassword, validatePasswordPolicy } from "@/lib/crypto/passwords";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { token, newPassword } = await parseJsonBody(req, passwordResetConfirmSchema);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256Hex(token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ApiError(400, "This reset link is invalid or has expired. Request a new one.", "INVALID_TOKEN");
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      throw new ApiError(400, policy.reason!, "WEAK_PASSWORD");
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    await revokeAllSessionsForUser(record.userId);
    await logAudit({ actorId: record.userId, action: "PASSWORD_RESET_COMPLETED", req });

    return Response.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
