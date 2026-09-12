import { describe, expect, it } from "vitest";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  checkPassword,
  passwordStrength,
} from "@/lib/password-policy";
import { validatePasswordPolicy } from "@/lib/crypto/passwords";

describe("checkPassword", () => {
  it("rejects a 9-character password and says why", () => {
    /*
     * The exact case that was reported: a nine-character password was
     * refused with no visible explanation, because the form's resolver threw
     * instead of returning an error. The rejection must now carry a reason
     * the UI can show.
     */
    const result = checkPassword("123456789");
    expect(result.valid).toBe(false);
    expect(result.reason).toBeTruthy();
    expect(result.reason).toMatch(/10 characters/);
  });

  it("accepts a password that meets every rule", () => {
    const result = checkPassword("Crescent-4821");
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.satisfied).toHaveLength(PASSWORD_RULES.length);
  });

  it("requires a letter and a number or symbol", () => {
    expect(checkPassword("1234567890").valid).toBe(false); // no letter
    expect(checkPassword("abcdefghij").valid).toBe(false); // no number/symbol
    expect(checkPassword("abcdefghi1").valid).toBe(true);
  });

  it("rejects commonly breached passwords even when long enough", () => {
    expect(checkPassword("password123").valid).toBe(false);
  });

  it("reports partial progress so the checklist can tick rules off", () => {
    const result = checkPassword("abc1");
    expect(result.valid).toBe(false);
    // Short, but it does have a letter and a digit.
    expect(result.satisfied).toContain("letter");
    expect(result.satisfied).toContain("number-or-symbol");
    expect(result.satisfied).not.toContain("length");
  });

  it("treats an empty password as unsatisfied rather than 'not common'", () => {
    // Otherwise an untouched field shows a rule already ticked.
    expect(checkPassword("").satisfied).not.toContain("not-common");
  });

  it("rejects an absurdly long password", () => {
    expect(checkPassword("a1".repeat(100)).valid).toBe(false);
  });
});

describe("policy agreement", () => {
  it("never accepts something the bcrypt-layer policy would reject", () => {
    /*
     * Two implementations of "is this password allowed" existed, and the UI
     * followed one while the API enforced the other. They must not disagree
     * about the minimum length or the blocklist.
     */
    const samples = [
      "123456789",
      "1234567890",
      "password123",
      "Crescent-4821",
      "abcdefghi1",
      "qwertyuiop",
      "",
    ];

    for (const sample of samples) {
      const shared = checkPassword(sample).valid;
      const legacy = validatePasswordPolicy(sample).valid;
      // The shared policy is allowed to be stricter, never looser.
      if (shared) expect(legacy, `"${sample}" accepted by policy but rejected by hasher`).toBe(true);
    }
  });

  it("agrees on the minimum length constant", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(validatePasswordPolicy("a".repeat(PASSWORD_MIN_LENGTH - 1)).valid).toBe(false);
  });
});

describe("passwordStrength", () => {
  it("never rates an invalid password above weak", () => {
    expect(passwordStrength("short")).toBe("weak");
    expect(passwordStrength("password123")).toBe("weak");
  });

  it("rises with length and variety", () => {
    const order = ["weak", "fair", "good", "strong"] as const;
    const fair = order.indexOf(passwordStrength("abcdefghi1"));
    const strong = order.indexOf(passwordStrength("Crescent-Harbor-4821!"));
    expect(strong).toBeGreaterThan(fair);
  });
});
