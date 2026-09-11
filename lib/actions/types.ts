/**
 * The single result shape every Server Action returns.
 *
 * Actions never throw across the network boundary for *expected* failures
 * (validation, permission, conflict) — React would surface those to the
 * client as an opaque "An error occurred in the Server Components render"
 * with the real message stripped in production. Returning a discriminated
 * union instead means the UI can render a precise, human message and
 * per-field errors, while genuinely unexpected errors still throw and hit
 * the error boundary.
 */
export type ActionResult<TData = undefined> =
  | { ok: true; data: TData; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string> };

/** Initial state for `useActionState` — nothing submitted yet. */
export const IDLE_ACTION_STATE = { ok: true as const, data: undefined };

export function actionOk(): ActionResult<undefined>;
export function actionOk<TData>(data: TData, message?: string): ActionResult<TData>;
export function actionOk<TData>(data?: TData, message?: string): ActionResult<TData | undefined> {
  return { ok: true, data, message };
}

export function actionError(
  error: string,
  opts: { code?: string; fieldErrors?: Record<string, string> } = {}
): ActionResult<never> {
  return { ok: false, error, code: opts.code, fieldErrors: opts.fieldErrors };
}
