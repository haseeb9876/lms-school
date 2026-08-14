import { withAuth } from "@/lib/auth/with-auth";
import { prisma } from "@/lib/db";
import { encryptField } from "@/lib/crypto/encryption";
import { generateTotpSecret, buildTotpUri, totpUriToQrDataUrl } from "@/lib/auth/two-factor";

/** Generates (or regenerates) a pending TOTP secret — not active until confirmed. */
export const POST = withAuth(null, async (_req, { session }) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const settings = await prisma.schoolSettings.findUnique({ where: { id: "school" } });

  const secret = generateTotpSecret();
  await prisma.twoFactorMethod.upsert({
    where: { userId_type: { userId: user.id, type: "TOTP" } },
    create: { userId: user.id, type: "TOTP", secret: encryptField(secret), enabled: false },
    update: { secret: encryptField(secret), enabled: false, verifiedAt: null },
  });

  const uri = buildTotpUri(secret, user.name, settings?.schoolName ?? "School LMS");
  const qrDataUrl = await totpUriToQrDataUrl(uri);

  return Response.json({ secret, qrDataUrl });
});
