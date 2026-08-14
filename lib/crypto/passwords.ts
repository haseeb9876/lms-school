import bcrypt from "bcryptjs";
import { COMMON_PASSWORDS } from "./common-passwords";

const BCRYPT_COST = 12;
const MIN_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordPolicy(password: string): { valid: boolean; reason?: string } {
  if (password.length < MIN_LENGTH) {
    return { valid: false, reason: `Password must be at least ${MIN_LENGTH} characters.` };
  }
  if (password.length > 128) {
    return { valid: false, reason: "Password is too long." };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, reason: "This password is too common. Choose a less predictable one." };
  }
  return { valid: true };
}
