/**
 * Checks on the office password desk.
 *
 * Two things are worth proving here and neither is visible from the UI.
 *
 * First, that the lookup is not an enumeration oracle. The desk takes a
 * CNIC and returns a named person with their class and their father's name
 * — which is exactly the query an attacker would want to run against a
 * range of numbers. It only answers on a complete, exact match.
 *
 * Second, that "reset" really means all three of its parts. A new password
 * that leaves a live session alone has locked nobody out; one that leaves an
 * emailed reset link valid can be undone minutes later by whoever holds it.
 * Those are silent failures — the office would believe the account was
 * secured — so they are asserted directly against the database.
 *
 *   npm run recovery
 */
import { PrismaClient } from "@prisma/client";
import { findAccountByCnic } from "../lib/queries/account-recovery";
import { resetAccountPassword } from "../lib/password-reset";
import { verifyPassword, hashPassword } from "../lib/crypto/passwords";
import { encryptField, decryptField, blindIndex } from "../lib/crypto/encryption";
import { sha256Hex, randomToken } from "../lib/crypto/hash";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const PROBE_CNIC = "4210100000077";

async function main(): Promise<void> {
  console.log("\nA. The lookup finds a real person, with facts to check at the counter");
  const student = await prisma.user.findFirstOrThrow({
    where: { role: "STUDENT" },
    select: { id: true, name: true, cnic: true },
  });
  const cnic = decryptField(student.cnic);

  const match = await findAccountByCnic(cnic);
  check("finds the student", match?.id === student.id, String(match?.id));
  check("knows their class", Boolean(match?.identifiers.some((i) => i.label === "Class")));
  check(
    "names a parent, so the principal can ask",
    Boolean(match?.identifiers.some((i) => ["Father", "Mother", "Guardian"].includes(i.label)))
  );
  check("reports how many devices a reset will sign out", typeof match?.activeSessions === "number");

  console.log("\nB. Dashes and spaces are how a CNIC is actually written");
  const dashed = `${cnic.slice(0, 5)}-${cnic.slice(5, 12)}-${cnic.slice(12)}`;
  check(`"${dashed}" finds the same account`, (await findAccountByCnic(dashed))?.id === student.id);

  console.log("\nC. It is not an enumeration oracle");
  for (const probe of [cnic.slice(0, 12), cnic.slice(0, 6), "4", "", "abc", "%", "' OR 1=1 --"]) {
    check(`"${probe}" returns nothing`, (await findAccountByCnic(probe)) === null);
  }
  // A neighbouring valid-length number must not match either.
  const neighbour = String(BigInt(cnic) + 7n).padStart(13, "0");
  check("a different 13-digit number returns nothing", (await findAccountByCnic(neighbour)) === null);

  console.log("\nD. A reset ends sessions and voids links, not just the password");
  const probe = await prisma.user.create({
    data: {
      cnic: encryptField(PROBE_CNIC),
      cnicHash: blindIndex(PROBE_CNIC),
      name: "Recovery Probe",
      role: "TEACHER",
      passwordHash: await hashPassword("Original-Password-1"),
    },
  });

  try {
    // Three live sessions and two outstanding reset links, as an account in
    // trouble would actually look.
    await prisma.session.createMany({
      data: [1, 2, 3].map(() => ({
        userId: probe.id,
        refreshTokenHash: sha256Hex(randomToken(32)),
        expiresAt: new Date(Date.now() + 86_400_000),
      })),
    });
    await prisma.passwordResetToken.createMany({
      data: [1, 2].map(() => ({
        userId: probe.id,
        tokenHash: sha256Hex(randomToken(32)),
        expiresAt: new Date(Date.now() + 3_600_000),
      })),
    });

    const outcome = await resetAccountPassword(probe.id, "Chosen-At-Counter-9", {
      mustChange: false,
    });

    check("all three sessions ended", outcome.sessionsEnded === 3, String(outcome.sessionsEnded));
    check("both reset links voided", outcome.resetLinksVoided === 2, String(outcome.resetLinksVoided));

    const liveSessions = await prisma.session.count({
      where: { userId: probe.id, revokedAt: null },
    });
    check("no live session remains in the database", liveSessions === 0, String(liveSessions));

    const liveTokens = await prisma.passwordResetToken.count({
      where: { userId: probe.id, usedAt: null },
    });
    check("no usable reset link remains", liveTokens === 0, String(liveTokens));

    const after = await prisma.user.findUniqueOrThrow({ where: { id: probe.id } });
    check("the new password works", await verifyPassword("Chosen-At-Counter-9", after.passwordHash));
    check("the old password does not", !(await verifyPassword("Original-Password-1", after.passwordHash)));
    check(
      "a password they chose themselves is not forced to change again",
      after.mustChangePassword === false
    );

    console.log("\nE. A temporary password is forced to change; a chosen one is not");
    await resetAccountPassword(probe.id, "Temporary-Issued-4", { mustChange: true });
    const afterTemp = await prisma.user.findUniqueOrThrow({ where: { id: probe.id } });
    check("temporary password forces a change at sign-in", afterTemp.mustChangePassword === true);
    check("and it is the password that now works", await verifyPassword("Temporary-Issued-4", afterTemp.passwordHash));

    console.log("\nF. The password is never stored or logged in readable form");
    check(
      "the stored hash is a bcrypt hash, not the password",
      afterTemp.passwordHash.startsWith("$2") && !afterTemp.passwordHash.includes("Temporary-Issued-4")
    );
    const auditRows = await prisma.auditLog.findMany({
      where: { targetId: probe.id },
      select: { metadata: true },
    });
    check(
      "no audit entry contains the password",
      !JSON.stringify(auditRows).includes("Temporary-Issued-4"),
      JSON.stringify(auditRows).slice(0, 200)
    );
  } finally {
    await prisma.user.delete({ where: { id: probe.id } });
  }

  await prisma.$disconnect();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.user.deleteMany({ where: { cnicHash: blindIndex(PROBE_CNIC) } });
  process.exit(1);
});
