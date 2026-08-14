/**
 * Login identifiers (CNIC / phone) get typed with inconsistent spacing and
 * dashes ("42101-1234567-1" vs "4210112345671"). Normalize before hashing
 * or comparing so lookups aren't format-sensitive.
 */
export function normalizeCnic(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

export function normalizePhone(input: string): string {
  const digitsAndPlus = input.replace(/[^0-9+]/g, "");
  return digitsAndPlus.startsWith("+") ? digitsAndPlus : digitsAndPlus.replace(/^0/, "+92");
}
