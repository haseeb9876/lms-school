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
 * Opens several pooled connections up front.
 *
 * Prisma creates connections lazily and one at a time, and against this
 * database each handshake costs about as much as a query — roughly 260ms.
 * A page that issues eight queries in parallel therefore pays for eight
 * *serial* handshakes on the first request that needs them: measured at
 * 2.4s cold against 265ms once the pool is warm, for the identical work.
 *
 * Warming at startup moves that cost off the first user's request. The
 * queries are trivial, run once per process, and failure is ignored — if
 * the database is unreachable the app has bigger problems than a cold pool,
 * and the real request will surface it properly.
 */
const WARM_CONNECTIONS = 8;

async function warmPool(): Promise<void> {
  try {
    await Promise.all(
      Array.from({ length: WARM_CONNECTIONS }, () => prisma.$queryRaw`SELECT 1`)
    );
  } catch {
    // Deliberately silent — see above.
  }
}

if (!globalForPrisma.prismaWarmed) {
  globalForPrisma.prismaWarmed = true;
  // Not awaited: module initialisation must not block on the network.
  void warmPool();
}

