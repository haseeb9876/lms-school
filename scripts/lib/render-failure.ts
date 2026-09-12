/**
 * Detects a page that threw while rendering, from its HTML alone.
 *
 * This exists because **an HTTP 200 does not mean the page worked.**
 *
 * Every segment in this app has a `loading.tsx`, so the App Router streams
 * the shell and a skeleton the instant a request arrives. If a Server
 * Component then throws, the status line has already gone out as 200 and
 * cannot be changed — React streams an error into the payload instead, and
 * the client-side `error.tsx` boundary swaps it in after hydration.
 *
 * Three things were learned building this, each the hard way:
 *
 *  1. A check reading only the status code scores a completely broken page
 *     as passing. A stale Prisma client left `/dashboard` and `/datesheets`
 *     throwing on every request and the smoke suite reported 91/91.
 *
 *  2. Marking up the error boundary and grepping for that markup does not
 *     work: `error.tsx` is a Client Component, so its HTML is never in the
 *     server's response at all. That fix was tried first and, tested against
 *     a deliberately broken page, caught nothing.
 *
 *  3. What *is* in the response is React Flight's own error row —
 *     `<rowId>:E{"digest":…}` where a component should have been. But not
 *     every error row is a failure: `redirect()` and `notFound()` are
 *     implemented by throwing, so a page that legitimately redirects emits
 *     an identical-looking row. Treating those as breakage reported
 *     `/attendance/mark` as broken when it was correctly defaulting to the
 *     teacher's first class.
 *
 * So: find the error rows, then keep only the ones whose digest is not a
 * framework control-flow sentinel. The sentinel list matches the one
 * `lib/actions/with-action.ts` already rethrows for the same reason.
 *
 * Quotes may be escaped, because the payload is embedded inside a JavaScript
 * string literal in a `self.__next_f.push(...)` call.
 */
const FLIGHT_ERROR_ROW = /\d+:E\{\\?"digest\\?":\\?"((?:[^"\\]|\\.)*?)\\?"/g;

/** Digests the framework uses for control flow, not for failure. */
const CONTROL_FLOW = ["NEXT_REDIRECT", "NEXT_NOT_FOUND", "NEXT_HTTP_ERROR_FALLBACK"];

function isControlFlow(digest: string): boolean {
  return CONTROL_FLOW.some((sentinel) => digest.startsWith(sentinel));
}

/** Every genuine error digest in the payload, ignoring redirects and 404s. */
function failureDigests(html: string): string[] {
  const digests: string[] = [];
  for (const match of html.matchAll(FLIGHT_ERROR_ROW)) {
    const digest = match[1];
    if (!isControlFlow(digest)) digests.push(digest);
  }
  return digests;
}

export function threwWhileRendering(html: string): boolean {
  return failureDigests(html).length > 0;
}

/**
 * Where a page redirected to, if it did. Returned so a check can follow a
 * streamed redirect — `fetch` cannot, because the redirect is expressed in
 * the body after a 200 has already been sent, not in a Location header.
 */
export function streamedRedirectTarget(html: string): string | null {
  for (const match of html.matchAll(FLIGHT_ERROR_ROW)) {
    const digest = match[1];
    if (!digest.startsWith("NEXT_REDIRECT")) continue;
    // NEXT_REDIRECT;replace;/path?query;307;
    const target = digest.split(";")[2];
    if (target) return target.replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
  }
  return null;
}

/**
 * The error's message, when the server is willing to give one.
 *
 * Development payloads carry the message and stack; production payloads
 * carry only the digest, which is deliberate — the digest is what appears in
 * the server log and on the error screen, and is the thing to search for.
 */
export function renderFailureDetail(html: string): string {
  const digests = failureDigests(html);
  if (digests.length === 0) return "page threw while rendering";

  const message = html.match(/\d+:E\{\\?"digest\\?":\\?"[^"\\]+\\?",\\?"name\\?":\\?"[^"\\]*\\?",\\?"message\\?":\\?"((?:[^"\\]|\\.)*?)\\?"/);
  return message ? `page threw: ${message[1]}` : `page threw (digest ${digests[0]})`;
}
