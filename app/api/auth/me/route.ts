import { withAuth } from "@/lib/auth/with-auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { decryptField } from "@/lib/crypto/encryption";

export const GET = withAuth(null, async (_req, { session }) => {
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new ApiError(404, "User not found.");

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      cnic: decryptField(user.cnic),
      phone: user.phone,
      email: user.email,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
    },
  });
});
