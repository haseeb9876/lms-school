import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimiter {
  limit(key: string): Promise<{ success: boolean }>;
}

/**
 * Single-process fallback for local dev only. In a serverless deployment
 * each invocation may be a fresh, memory-isolated instance, so this does
 * NOT provide real protection in production — Upstash is required there.
 */
class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private max: number, private windowMs: number) {}

  async limit(key: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || now > entry.resetAt) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { success: true };
    }
    entry.count += 1;
    return { success: entry.count <= this.max };
  }
}

class UpstashRateLimiter implements RateLimiter {
  private ratelimit: Ratelimit;

  constructor(redis: Redis, max: number, windowSeconds: number) {
    this.ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
    });
  }

  async limit(key: string): Promise<{ success: boolean }> {
    const result = await this.ratelimit.limit(key);
    return { success: result.success };
  }
}

let warnedAboutFallback = false;

function buildLimiter(max: number, windowSeconds: number): RateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return new UpstashRateLimiter(new Redis({ url, token }), max, windowSeconds);
  }
  if (!warnedAboutFallback) {
    console.warn(
      "[rate-limit] Upstash not configured — using an in-memory limiter. " +
        "This does not work correctly across multiple serverless instances; set " +
        "UPSTASH_REDIS_REST_URL/TOKEN before deploying."
    );
    warnedAboutFallback = true;
  }
  return new InMemoryRateLimiter(max, windowSeconds * 1000);
}

export const loginRateLimiter = buildLimiter(5, 15 * 60);
export const otpRateLimiter = buildLimiter(5, 10 * 60);
export const passwordResetRateLimiter = buildLimiter(3, 60 * 60);
export const ticketRateLimiter = buildLimiter(10, 60 * 60);

export function clientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
