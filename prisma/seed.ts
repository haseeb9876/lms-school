import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/crypto/passwords";
import { encryptField, blindIndex } from "../lib/crypto/encryption";
import { normalizeCnic } from "../lib/crypto/identifiers";

const prisma = new PrismaClient();

async function main() {
  const cnic = process.env.SEED_PRINCIPAL_CNIC ?? "3520112345671";
  const password = process.env.SEED_PRINCIPAL_PASSWORD ?? "ChangeThisPassword2026!";
  const normalizedCnic = normalizeCnic(cnic);
  const cnicHash = blindIndex(normalizedCnic);

  const existing = await prisma.user.findUnique({ where: { cnicHash } });
  if (existing) {
    console.log("A principal account with this CNIC already exists — skipping seed.");
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      cnic: encryptField(normalizedCnic),
      cnicHash,
      name: "School Principal",
      role: "PRINCIPAL",
      passwordHash,
      mustChangePassword: true,
    },
  });

  console.log("Seeded the first principal account:");
  console.log(`  CNIC:     ${normalizedCnic}`);
  console.log(`  Password: ${password}`);
  console.log("Change this password immediately after the first login.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
