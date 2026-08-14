import { withAuth } from "@/lib/auth/with-auth";
import { parseJsonBody } from "@/lib/validation";
import { twoFactorDisableSchema } from "@/lib/schemas/auth";
import { ApiError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto/passwords";
import { logAudit } from "@/lib/audit";

export const POST = withAuth(null, async (req, { session }) => {
  const { password } = await parseJsonBody(req, twoFactorDisableSchema);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(401, "Your password is incorrect.", "INVALID_PASSWORD");
  }

  await prisma.$transaction([
    prisma.twoFactorMethod.deleteMany({ where: { userId: session.userId } }),
    prisma.recoveryCode.deleteMany({ where: { userId: session.userId } }),
    prisma.user.update({ where: { id: session.userId }, data: { twoFactorEnabled: false } }),
  ]);

  await logAudit({ actorId: session.userId, action: "TWO_FA_DISABLED", req });

  return Response.json({ ok: true });
});
