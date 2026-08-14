import { withAuth } from "@/lib/auth/with-auth";
import { parseJsonBody } from "@/lib/validation";
import { totpConfirmSchema } from "@/lib/schemas/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/crypto/encryption";
import { verifyTotpCode, generateRecoveryCodes } from "@/lib/auth/two-factor";
import { logAudit } from "@/lib/audit";

export const POST = withAuth(null, async (req, { session }) => {
  const { code } = await parseJsonBody(req, totpConfirmSchema);

  const method = await prisma.twoFactorMethod.findUnique({
    where: { userId_type: { userId: session.userId, type: "TOTP" } },
  });
  if (!method?.secret) {
    throw new ApiError(400, "Start enrollment first.", "NOT_ENROLLED");
  }

  if (!verifyTotpCode(decryptField(method.secret), code)) {
    throw new ApiError(401, "That code isn't valid. Check the time on your device and try again.", "INVALID_CODE");
  }

  await prisma.$transaction([
    prisma.twoFactorMethod.update({
      where: { id: method.id },
      data: { enabled: true, verifiedAt: new Date() },
    }),
    prisma.user.update({ where: { id: session.userId }, data: { twoFactorEnabled: true } }),
  ]);

  const recoveryCodes = await generateRecoveryCodes(session.userId);
  await logAudit({ actorId: session.userId, action: "TWO_FA_ENABLED", req, metadata: { type: "TOTP" } });

  return Response.json({ ok: true, recoveryCodes });
});
