import crypto from "node:crypto";

/** For high-entropy random tokens (session/reset/OTP) — not for passwords. */
export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function randomNumericCode(digits = 6): string {
  const max = 10 ** digits;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(digits, "0");
}
