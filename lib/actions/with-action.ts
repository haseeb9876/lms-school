import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { getCurrentSession, type SessionInfo } from "@/lib/auth/current-user";
import { actionError, type ActionResult } from "./types";

/**
 * Server Actions are reachable by direct POST, not just through our own UI —
 * the Next.js docs call this out explicitly. That makes them exactly as
 * exposed as an API route, so they get exactly the same treatment the API
 * routes get from `withAuth`: session re-verified from the cookie, role
 * checked, input validated, internal errors never leaked.
 *
 * `scripts/check-auth-coverage.ts` fails the build if an action file exports
 * a function that didn't come out of this wrapper, so a forgotten check
 * breaks CI instead of silently shipping a hole.
 */

export interface ActionContext {
  session: SessionInfo;
  /** The acting user, re-read from the database (not from the token). */
  user: { id: string; name: string; role: Role };
}

/**
 * Next.js implements `redirect()` and `notFound()` by throwing a tagged
 * error it expects to bubble all the way out. Swallowing those in our catch
 * would turn a working redirect into a generic "something went wrong", so
 * they're rethrown untouched.
 */
function isFrameworkControlFlow(err: unknown): boolean {
  if (!err || typeof err !== "object" || !("digest" in err)) return false;
  const digest = (err as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    // First message per field wins — showing one clear error under an input
    // reads better than stacking every rule that failed on it.
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

interface ActionOptions<TSchema extends z.ZodTypeAny> {
  /** Roles allowed to invoke this action. `null` means any signed-in user. */
  roles: Role[] | null;
  /** Validates the action's input before the handler ever sees it. */
  input?: TSchema;
}

type HandlerFor<TSchema extends z.ZodTypeAny, TData> = TSchema extends z.ZodTypeAny
  ? (input: z.infer<TSchema>, ctx: ActionContext) => Promise<ActionResult<TData>>
  : never;

/**
 * Wraps a mutation so it cannot run without an authenticated, authorized,
 * still-active user and validated input.
 */
export function withAction<TSchema extends z.ZodTypeAny, TData>(
  options: ActionOptions<TSchema>,
  handler: HandlerFor<TSchema, TData>
): (input: z.input<TSchema>) => Promise<ActionResult<TData>> {
  return async (rawInput: z.input<TSchema>): Promise<ActionResult<TData>> => {
    try {
      const session = await getCurrentSession();
      if (!session) {
        return actionError("You need to sign in to do that.", { code: "NOT_AUTHENTICATED" });
      }

      if (options.roles && !options.roles.includes(session.role)) {
        return actionError("You don't have permission to do that.", { code: "FORBIDDEN_ROLE" });
      }

      /*
       * Read the user fresh rather than trusting the token's claims. An
       * access token stays cryptographically valid until it expires, so a
       * principal suspending an account mid-session would otherwise leave
       * that user able to keep writing until their token ran out. A
       * suspension should stop the next write, not the next login.
       */
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, role: true, status: true },
      });

      if (!user || user.status !== "ACTIVE") {
        return actionError("Your account is no longer active.", { code: "ACCOUNT_INACTIVE" });
      }

      // The role in the database wins over the role baked into the token, so
      // a demotion takes effect immediately too.
      if (options.roles && !options.roles.includes(user.role)) {
        return actionError("You don't have permission to do that.", { code: "FORBIDDEN_ROLE" });
      }

      let input: z.infer<TSchema> = rawInput as z.infer<TSchema>;
      if (options.input) {
        const parsed = options.input.safeParse(rawInput);
        if (!parsed.success) {
          return actionError(parsed.error.issues[0]?.message ?? "Please check the form for errors.", {
            code: "VALIDATION_ERROR",
            fieldErrors: fieldErrorsFrom(parsed.error),
          });
        }
        input = parsed.data;
      }

      return await handler(input, {
        session: { ...session, role: user.role },
        user: { id: user.id, name: user.name, role: user.role },
      });
    } catch (err) {
      if (isFrameworkControlFlow(err)) throw err;

      // Authorization helpers (lib/auth/rbac) signal refusal by throwing
      // ApiError — those messages are written for users, so they're safe to
      // pass through verbatim.
      if (err instanceof ApiError) {
        return actionError(err.message, { code: err.code });
      }

      const errorId = crypto.randomUUID();
      console.error(`[action-error ${errorId}]`, err);
      return actionError("Something went wrong. Please try again.", { code: `INTERNAL:${errorId}` });
    }
  };
}
