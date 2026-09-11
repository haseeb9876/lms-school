/**
 * Shared formatting helpers.
 *
 * Every formatter here is pinned to an explicit locale and time zone rather
 * than using the runtime default. A server in UTC and a browser in Karachi
 * would otherwise format the same timestamp differently, and a date rendered
 * on the server then re-rendered on the client would trip a hydration
 * mismatch — or worse, silently show an attendance record on the wrong day.
 */

const LOCALE = "en-PK";
const TIME_ZONE = "Asia/Karachi";

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});

const weekdayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  timeZone: TIME_ZONE,
});

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

export function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value));
}

export function formatShortDate(value: Date | string): string {
  return shortDateFormatter.format(new Date(value));
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatWeekday(value: Date | string): string {
  return weekdayFormatter.format(new Date(value));
}

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/**
 * `<input type="date">` requires exactly this shape.
 *
 * Reads the UTC components deliberately: dates that come out of the database
 * are `@db.Date` columns stored at UTC midnight, and converting those to a
 * local calendar day would shift them by a day in any negative-offset zone.
 */
export function toDateInputValue(value: Date | string): string {
  const date = new Date(value);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

// en-CA formats as YYYY-MM-DD, which is exactly the shape a date input and
// our own date params use.
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

/**
 * Today's date *as the school experiences it*.
 *
 * Every other formatter here renders in Asia/Karachi, so deriving "today"
 * from UTC instead would disagree with them for the five hours each night
 * when Karachi has rolled over and UTC hasn't. In that window a teacher
 * taking the morning register would be offered yesterday's date, and a
 * future-date guard computed the same way would reject the day they're
 * actually standing in.
 */
export function todaySchoolDate(): string {
  return isoDateFormatter.format(new Date());
}

/** The school-local calendar day a given instant falls on. */
export function toSchoolDateString(value: Date | string): string {
  return isoDateFormatter.format(new Date(value));
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600_000],
  ["month", 30 * 24 * 3600_000],
  ["week", 7 * 24 * 3600_000],
  ["day", 24 * 3600_000],
  ["hour", 3600_000],
  ["minute", 60_000],
];

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/** "3 days ago", "in 2 hours" — for feeds and activity lists. */
export function formatRelativeTime(value: Date | string, now: Date = new Date()): string {
  const diff = new Date(value).getTime() - now.getTime();
  const absDiff = Math.abs(diff);

  if (absDiff < 60_000) return "just now";

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (absDiff >= ms) {
      return relativeFormatter.format(Math.round(diff / ms), unit);
    }
  }

  return "just now";
}

/** "08:00" → "8:00 AM". Timetable slots are stored as plain strings. */
export function formatTimeOfDay(hhmm: string): string {
  const [hoursRaw, minutes] = hhmm.split(":");
  const hours = Number(hoursRaw);
  if (!Number.isFinite(hours)) return hhmm;
  const period = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${minutes} ${period}`;
}

/** Turns an enum value like IN_PROGRESS into "In progress". */
export function humanizeEnum(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
