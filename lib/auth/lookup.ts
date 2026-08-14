import { prisma } from "@/lib/db";
import { blindIndex } from "@/lib/crypto/encryption";
import { normalizeCnic, normalizePhone } from "@/lib/crypto/identifiers";

/** Login/reset identifier can be a CNIC or a phone number — try both. */
export async function findUserByIdentifier(identifier: string) {
  const cnicHash = blindIndex(normalizeCnic(identifier));
  const byCnic = await prisma.user.findUnique({ where: { cnicHash } });
  if (byCnic) return byCnic;

  const phoneHash = blindIndex(normalizePhone(identifier));
  return prisma.user.findUnique({ where: { phoneHash } });
}
