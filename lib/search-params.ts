/**
 * Helpers for the URL-as-state pattern every list page in this app uses:
 * filters, search and pagination all live in the query string, so a filtered
 * view can be linked, bookmarked and restored by the back button.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Takes the first value when a param appears more than once. */
export function readParam(params: RawSearchParams, key: string): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

export function readPage(params: RawSearchParams, key = "page"): number {
  const parsed = Number.parseInt(readParam(params, key) ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Reads a param only when it's one of the allowed values.
 *
 * These values flow into Prisma `where` clauses, so anything unrecognised
 * has to become `undefined` rather than reaching the query — a hand-edited
 * `?status=DROP TABLE` should simply not filter.
 */
export function readEnum<const TValues extends readonly string[]>(
  params: RawSearchParams,
  key: string,
  allowed: TValues
): TValues[number] | undefined {
  const value = readParam(params, key);
  return value && (allowed as readonly string[]).includes(value)
    ? (value as TValues[number])
    : undefined;
}

/**
 * Builds an href that preserves the current filters and changes only what's
 * passed in. Passing `undefined` for a key removes it.
 */
export function buildHref(
  pathname: string,
  current: RawSearchParams,
  changes: Record<string, string | number | undefined>
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }

  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") params.delete(key);
    else params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
