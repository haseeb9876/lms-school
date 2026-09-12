import { formatWeekday } from "@/lib/format";

/** Titles that must not be mistaken for a given name. */
const HONORIFICS = new Set([
  "dr", "mr", "mrs", "ms", "miss", "mx", "prof", "professor",
  "sir", "madam", "engr", "hafiz", "syed", "sheikh", "mufti", "qari",
]);

/**
 * The name to greet someone by.
 *
 * Naively taking the first whitespace-separated token greets "Dr. Sameena
 * Iqbal" as "Dr." — staff records here routinely carry a title, and several
 * of the common ones in Pakistan (Syed, Hafiz) sit in the same position as
 * a given name. Titles are skipped; if a name is *only* titles, the whole
 * thing is used rather than greeting nobody.
 */
export function firstNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const named = parts.find(
    (part) => !HONORIFICS.has(part.replace(/\./g, "").toLowerCase())
  );
  return named ?? parts[0] ?? fullName;
}

/**
 * Time-of-day greeting, computed in the school's own timezone so it matches
 * the clock the reader is looking at rather than the server's.
 */
export function Greeting({ name, subtitle }: { name: string; subtitle: string }) {
  const karachiHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Karachi",
    }).format(new Date())
  );

  const greeting =
    karachiHour < 12 ? "Good morning" : karachiHour < 17 ? "Good afternoon" : "Good evening";

  const firstName = firstNameOf(name);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
        {greeting}, {firstName}
      </h1>
      <p className="mt-1 text-sm text-fg-subtle">
        {formatWeekday(new Date())} · {subtitle}
      </p>
    </div>
  );
}
