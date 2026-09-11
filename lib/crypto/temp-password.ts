import crypto from "node:crypto";

/**
 * Words chosen to be unambiguous when read aloud or written on a slip: no
 * homophones, no words that differ by one letter, nothing that could be
 * mistaken for another on a handwritten note.
 */
const WORDS = [
  "amber", "anchor", "basket", "bridge", "candle", "canvas", "cedar", "cobalt",
  "copper", "coral", "crystal", "delta", "ember", "falcon", "forest", "garnet",
  "harbor", "indigo", "ivory", "jasmine", "jungle", "kettle", "lantern", "linen",
  "marble", "meadow", "nectar", "nutmeg", "orchid", "pepper", "pewter", "prism",
  "quartz", "quiver", "ribbon", "saffron", "silver", "summit", "tundra", "velvet",
];

/**
 * A temporary password a school office can read out over the phone.
 *
 * Generated rather than chosen: a principal creating thirty accounts in an
 * afternoon will otherwise reuse one password for all of them. The shape
 * (Word-Word-1234) clears the 10-character policy, survives being written
 * on a slip of paper, and is never a dictionary word on its own.
 *
 * It is always paired with `mustChangePassword`, so it only has to survive
 * until the account holder's first sign-in.
 */
export function generateTempPassword(): string {
  const first = WORDS[crypto.randomInt(0, WORDS.length)];
  let second = WORDS[crypto.randomInt(0, WORDS.length)];
  // Two identical words would read as a mistake and halve the entropy.
  while (second === first) {
    second = WORDS[crypto.randomInt(0, WORDS.length)];
  }
  const digits = String(crypto.randomInt(1000, 10000));

  const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  return `${capitalise(first)}-${capitalise(second)}-${digits}`;
}
