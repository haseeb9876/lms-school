import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { clientIp } from "@/lib/auth/rate-limit";

interface LogAuditParams {
  actorId?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  /** Redacted only — never raw passwords/tokens/secrets. */
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Called explicitly at every sensitive mutation point rather than derived
 * automatically — explicit calls are easy to verify are actually present
 * during review.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      ip: params.req ? clientIp(params.req) : undefined,
      userAgent: params.req?.headers.get("user-agent") ?? undefined,
    },
  });
}
