import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaQueryCount?: number;
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

