import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Every route handler funnels unexpected errors through here. Clients only
 * ever see a generic message + an id to reference — never a raw stack trace
 * or database error string.
 */
export function handleApiError(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json({ error: err.message, code: err.code }, { status: err.status });
  }

  if (err instanceof ZodError) {
    const message = err.issues[0]?.message ?? "Invalid request.";
    return Response.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const errorId = crypto.randomUUID();
  console.error(`[api-error ${errorId}]`, err);
  return Response.json(
    { error: "Something went wrong. Please try again.", errorId },
    { status: 500 }
  );
}
