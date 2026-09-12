import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaQueryCount?: number;
  prismaWarmed?: boolean;
};

/**
 * Set PRISMA_LOG_QUERIES=1 to print every query with its duration, and
 * PRISMA_COUNT_QUERIES=1 to expose a running total on `globalThis`.
 *
 * Round trips are the dominant cost in this app — the database sits far
 * enough away that a single query costs more than rendering an entire page —
 * so "how many queries did that page issue" is the number worth watching
 * when a screen feels slow. Guessing at it is how a page ends up quietly
 * making fifteen.
 */
const shouldLog = process.env.PRISMA_LOG_QUERIES === "1";
const shouldCount = process.env.PRISMA_COUNT_QUERIES === "1";

function createClient(): PrismaClient {
  if (!shouldLog && !shouldCount) return new PrismaClient();

  const client = new PrismaClient({
    log: [{ emit: "event", level: "query" }],
  });

  globalForPrisma.prismaQueryCount = 0;

  // Cast because the event payload is only narrowed when `log` is a literal
  // in the constructor call, which it can't be behind this flag.
  (client as unknown as {
    $on: (e: "query", cb: (event: { query: string; duration: number }) => void) => void;
  }).$on("query", (event) => {
    if (shouldCount) globalForPrisma.prismaQueryCount = (globalForPrisma.prismaQueryCount ?? 0) + 1;
    if (shouldLog) {
      console.log(`[prisma ${String(event.duration).padStart(4)}ms] ${event.query.slice(0, 140)}`);
    }
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Opens several pooled connections up front — on a long-lived server only.
 *
 * Prisma creates connections lazily and one at a time, and against a distant
 * database each handshake costs about as much as a query — roughly 260ms. A
 * page issuing eight queries in parallel therefore pays for eight *serial*
 * handshakes on the first request that needs them: measured at 2.4s cold
 * against 265ms once warm, for identical work. Warming at startup moves that
 * cost off the first user's request.
 *
 * That reasoning inverts on serverless. There, "startup" happens on every
 * cold invocation, and each concurrent instance is its own process — so this
 * would open eight connections per instance, dozens or hundreds at once,
 * against a connection limit, to serve requests that mostly need one or two.
 * It would also add its own latency to the very cold start it is meant to
 * help. So on Vercel and friends the pool is left to fill on demand, which is
 * the right behaviour when the process may be discarded after one request.
 */
const WARM_CONNECTIONS = 8;

/**
 * True on Vercel, AWS Lambda and Netlify. Each sets its own marker; none of
 * them is set on an ordinary Node server, which is the case we want to warm.
 */
function isServerless(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY ||
      process.env.DISABLE_POOL_WARMUP
  );
}

async function warmPool(): Promise<void> {
  try {
    await Promise.all(
      Array.from({ length: WARM_CONNECTIONS }, () => prisma.$queryRaw`SELECT 1`)
    );
  } catch {
    // Deliberately silent: if the database is unreachable the app has bigger
    // problems than a cold pool, and the real request will surface it.
  }
}

if (!globalForPrisma.prismaWarmed && !isServerless()) {
  globalForPrisma.prismaWarmed = true;
  // Not awaited: module initialisation must not block on the network.
  void warmPool();
}

