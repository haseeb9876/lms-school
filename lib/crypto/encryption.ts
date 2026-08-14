import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("FIELD_ENCRYPTION_KEY is not set.");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes, encoded as 64 hex characters.");
  }
  return key;
}

/**
 * Encrypts a sensitive field (CNIC, guardian CNIC) for storage. Uses
 * AES-256-GCM with a random IV per value, so the same plaintext never
 * produces the same ciphertext twice. Because of that, the encrypted value
 * itself can't be used for equality lookups — see blindIndex() below.
 */
export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptField(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted field value.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/**
 * Deterministic HMAC-SHA256 "blind index" for a sensitive field. Since the
 * encrypted value can't be queried directly, uniqueness checks and login
 * lookups go through this instead — same input always produces the same
 * hash, without exposing the plaintext.
 */
export function blindIndex(normalizedValue: string): string {
  return crypto.createHmac("sha256", getKey()).update(normalizedValue).digest("hex");
}
