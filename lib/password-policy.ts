import { COMMON_PASSWORDS } from "./crypto/common-passwords";

/**
 * The password rules, in one place, shared by the browser and the server.
 *
 * They used to live only in the API route, with the form carrying a
 * hand-written hint that could drift from them. Someone typing a
 * nine-character password got no explanation of what was wrong — the form
 * accepted it and the request quietly failed. Deriving the checklist people
 * see from the same predicates the server enforces makes that impossible:
 * if a rule changes, the UI changes with it.
 *
 * Safe to import into a Client Component — the blocklist is ~100 entries,
 * not a dictionary.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordRule {
  id: string;
  /** Written as the requirement, so it reads correctly unmet or met. */
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "letter",
    label: "Contains a letter",
    test: (password) => /\p{L}/u.test(password),
  },
  {
    id: "number-or-symbol",
    label: "Contains a number or symbol",
    test: (password) => /[\d\p{P}\p{S}]/u.test(password),
  },
  {
    id: "not-common",
    label: "Not a commonly used password",
    // An empty box isn't "common" — it just has nothing to judge yet, and
    // marking it satisfied before typing would be misleading.
    test: (password) => password.length > 0 && !COMMON_PASSWORDS.has(password.toLowerCase()),
  },
];

export interface PasswordCheck {
  valid: boolean;
  /** Rule ids that currently pass. */
  satisfied: string[];
  /** The first unmet rule, phrased as an error. */
  reason?: string;
}

export function checkPassword(password: string): PasswordCheck {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { valid: false, satisfied: [], reason: "Password is too long." };
  }

  const satisfied = PASSWORD_RULES.filter((rule) => rule.test(password)).map((rule) => rule.id);
  const failed = PASSWORD_RULES.find((rule) => !satisfied.includes(rule.id));

  return {
    valid: !failed,
    satisfied,
    reason: failed ? `Password requirement not met: ${failed.label.toLowerCase()}.` : undefined,
  };
}

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

/**
 * A coarse strength band for the meter.
 *
 * Deliberately not a security guarantee — it's feedback, and it never
 * *permits* anything: `checkPassword` decides that. Length dominates,
 * because it genuinely matters more than character-class variety.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!checkPassword(password).valid) return "weak";

  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/\p{Lu}/u.test(password) && /\p{Ll}/u.test(password)) score++;
  if (/\d/.test(password) && /[\p{P}\p{S}]/u.test(password)) score++;

  if (score >= 4) return "strong";
  if (score >= 2) return "good";
  return "fair";
}
