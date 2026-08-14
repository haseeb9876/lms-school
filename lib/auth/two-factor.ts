import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import type { OtpPurpose } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sha256Hex, randomNumericCode, randomToken } from "@/lib/crypto/hash";

const OTP_TTL_MS = 10 * 60 * 1000;

// --- TOTP (authenticator app) ---------------------------------------------

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function buildTotpUri(secretBase32: string, accountLabel: string, issuer: string): string {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: accountLabel,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  return totp.toString();
}

export async function totpUriToQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri);
}

export function verifyTotpCode(secretBase32: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  const delta = totp.validate({ token: code.trim(), window: 1 });
  return delta !== null;
}

// --- Email OTP --------------------------------------------------------------

export async function issueOtpCode(userId: string, purpose: OtpPurpose): Promise<string> {
  const code = randomNumericCode(6);
  await prisma.otpCode.create({
    data: {
      userId,
      purpose,
      codeHash: sha256Hex(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  return code;
}

export async function verifyOtpCode(userId: string, purpose: OtpPurpose, code: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;
  if (record.codeHash !== sha256Hex(code.trim())) return false;
  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return true;
}

// --- Recovery codes ----------------------------------------------------------

export async function generateRecoveryCodes(userId: string): Promise<string[]> {
  await prisma.recoveryCode.deleteMany({ where: { userId, usedAt: null } });
  const codes = Array.from({ length: 10 }, () => randomToken(5).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
  await prisma.recoveryCode.createMany({
    data: await Promise.all(
      codes.map(async (code) => ({ userId, codeHash: await bcrypt.hash(code, 10) }))
    ),
  });
  return codes;
}

export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const candidates = await prisma.recoveryCode.findMany({ where: { userId, usedAt: null } });
  for (const candidate of candidates) {
    if (await bcrypt.compare(code.trim(), candidate.codeHash)) {
      await prisma.recoveryCode.update({ where: { id: candidate.id }, data: { usedAt: new Date() } });
      return true;
    }
  }
  return false;
}
