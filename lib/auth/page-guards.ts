import { redirect } from "next/navigation";
import { ApiError } from "@/lib/errors";

/**
 * Runs a row-level authorization check inside a Server Component.
 *
 * The helpers in `lib/auth/rbac` signal refusal by throwing `ApiError`,
 * which is right for API routes and Server Actions — both funnel it into a
 * proper 403 response. A page has no such funnel: an ApiError thrown during
 * render escapes to the error boundary, so a teacher opening a stale link
 * to another class saw "Something went wrong. Please try again." That reads
 * as a broken app rather than as a refusal, and invites them to retry
 * something that will never work.
 *
 * This converts the refusal into a redirect to /unauthorized, which is how
 * the rest of the app already declines a page (`requireAuth` does the same
 * for a failed role check). Genuinely unexpected errors still propagate to
 * the error boundary untouched.
 */
export async function guardPage(check: () => Promise<void>): Promise<void> {
  try {
    await check();
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      redirect("/unauthorized");
    }
    throw err;
  }
}
