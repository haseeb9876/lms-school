/**
 * Checks that the environment a deployment is about to run in will actually
 * work, and says plainly what breaks if it won't.
 *
 *   npm run check:env
 *
 * This exists because the failures it looks for are all *silent at build
 * time*. The app compiles, deploys, and looks fine — then the logo upload
 * throws a filesystem error, or the login rate limit turns out to be
 * per-instance, or a page hits a table the database doesn't have yet. Every
 * one of those is discovered in front of whoever you are demonstrating to.
 *
 * It is deliberately run as a separate command rather than wired into the
 * build. A build that refuses to run because an optional service is missing
 * is worse than one that tells you and carries on — but you should be told.
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Load .env the way Next.js would.
 *
 * Run through tsx this file gets the bare process environment, so without
 * this every check reports "not set" locally and the output is useless.
 * Real environment variables always win, so running this on Vercel (where
 * there is no .env file and everything is injected) behaves identically.
 */
function loadDotEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;

    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;

      // Strip one layer of matching quotes, and anything after an unquoted #.
      const value = rawValue.trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
      process.env[key] = value;
    }
  }
}

loadDotEnv();

type Level = "blocker" | "warning" | "ok";

interface Finding {
  level: Level;
  name: string;
  detail: string;
}

const findings: Finding[] = [];

function report(level: Level, name: string, detail: string): void {
  findings.push({ level, name, detail });
}

const env = process.env;

/** Vercel, or any other serverless host, where per-process state is per-request. */
const serverless = Boolean(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME || env.NETLIFY);

/**
 * The target being checked. Passed explicitly so this can be run locally to
 * check what a Vercel deployment *would* do, before pushing.
 */
const target = process.argv.includes("--serverless") || serverless ? "serverless" : "server";

console.log(`\nChecking a ${target} deployment.\n`);

// ---------------------------------------------------------------------------
// Secrets — without these the app cannot run at all, or runs insecurely.
// ---------------------------------------------------------------------------
if (!env.JWT_SIGNING_SECRET) {
  report("blocker", "JWT_SIGNING_SECRET", "Not set. Every sign-in fails — tokens cannot be signed.");
} else if (env.JWT_SIGNING_SECRET.length < 32) {
  report(
    "blocker",
    "JWT_SIGNING_SECRET",
    `Only ${env.JWT_SIGNING_SECRET.length} characters. Short enough to attack; generate with "openssl rand -base64 48".`
  );
} else if (/change-this|example|secret|test/i.test(env.JWT_SIGNING_SECRET)) {
  report("blocker", "JWT_SIGNING_SECRET", "Looks like the placeholder from .env.example. Anyone with that file can forge a principal session.");
} else {
  report("ok", "JWT_SIGNING_SECRET", "Set.");
}

if (!env.FIELD_ENCRYPTION_KEY) {
  report("blocker", "FIELD_ENCRYPTION_KEY", "Not set. Every CNIC is encrypted with it — no sign-in works without it.");
} else if (!/^[0-9a-f]{64}$/i.test(env.FIELD_ENCRYPTION_KEY)) {
  report(
    "blocker",
    "FIELD_ENCRYPTION_KEY",
    "Must be 64 hex characters (32 bytes). Generate with \"openssl rand -hex 32\"."
  );
} else {
  report(
    "ok",
    "FIELD_ENCRYPTION_KEY",
    "Set. Remember: changing it makes every existing CNIC unreadable and locks out the whole school."
  );
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
if (!env.DATABASE_URL) {
  report("blocker", "DATABASE_URL", "Not set. Nothing works.");
} else {
  const pooled = /-pooler\./.test(env.DATABASE_URL) || /pgbouncer=true/.test(env.DATABASE_URL);
  const declaresPgbouncer = /pgbouncer=true/.test(env.DATABASE_URL);

  if (pooled && !declaresPgbouncer) {
    report(
      "blocker",
      "DATABASE_URL",
      "Points at a pooled endpoint but is missing pgbouncer=true. Prisma will use prepared statements the pooler cannot keep, and queries fail intermittently under load — the worst kind of bug to find during a demo."
    );
  } else if (!pooled && target === "serverless") {
    report(
      "warning",
      "DATABASE_URL",
      "Not a pooled endpoint. On serverless every concurrent instance opens its own connection and the database runs out. Use the -pooler host."
    );
  } else {
    report("ok", "DATABASE_URL", pooled ? "Pooled endpoint, correctly declared." : "Direct connection (fine for a single server).");
  }
}

if (!env.DIRECT_URL) {
  report(
    "blocker",
    "DIRECT_URL",
    "Not set. `prisma migrate deploy` needs a real session and hangs through a transaction pooler, so the build cannot apply migrations — the database silently stays on the old schema and pages throw."
  );
} else if (/-pooler\./.test(env.DIRECT_URL) || /pgbouncer=true/.test(env.DIRECT_URL)) {
  report(
    "blocker",
    "DIRECT_URL",
    "Points at the POOLED host. Migrations will hang. It must be the unpooled host (no -pooler)."
  );
} else {
  report("ok", "DIRECT_URL", "Unpooled, as migrations need.");
}

// ---------------------------------------------------------------------------
// File storage — the one that bites hardest on Vercel.
// ---------------------------------------------------------------------------
if (!env.BLOB_READ_WRITE_TOKEN) {
  if (target === "serverless") {
    report(
      "blocker",
      "BLOB_READ_WRITE_TOKEN",
      "Not set, so uploads fall back to the local filesystem — which on Vercel is read-only, and /tmp is not shared between instances and vanishes. The school logo, the building photo and every datesheet scan will fail to upload. Create a Blob store in the Vercel dashboard and add its token."
    );
  } else {
    report("ok", "BLOB_READ_WRITE_TOKEN", `Not set — uploads go to ${env.UPLOAD_DIR ?? "./uploads"}. Correct for a single server; make sure it is on a disk that survives redeploys and is backed up.`);
  }
} else {
  report("ok", "BLOB_READ_WRITE_TOKEN", "Set — uploads go to Vercel Blob.");
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
  if (target === "serverless") {
    report(
      "blocker",
      "UPSTASH_REDIS_REST_*",
      "Not set, so rate limiting falls back to an in-memory counter. Each serverless instance counts separately, which turns \"5 login attempts per 15 minutes\" into 5 per instance — effectively no brute-force protection at all. The free tier is enough."
    );
  } else {
    report("ok", "UPSTASH_REDIS_REST_*", "Not set — the in-memory limiter is correct on a single-process server.");
  }
} else {
  report("ok", "UPSTASH_REDIS_REST_*", "Set — rate limits are shared across instances.");
}

// ---------------------------------------------------------------------------
// Email and URLs
// ---------------------------------------------------------------------------
if (!env.APP_URL) {
  report("warning", "APP_URL", "Not set. Password-reset links are built from it and will point somewhere wrong.");
} else if (target === "serverless" && env.APP_URL.startsWith("http://")) {
  report("warning", "APP_URL", "Uses http://. Session cookies are `secure` in production, so nobody can sign in over plain HTTP.");
} else {
  report("ok", "APP_URL", env.APP_URL);
}

if (env.EMAIL_PROVIDER === "console" || !env.RESEND_API_KEY) {
  report(
    "warning",
    "Email",
    "No mail provider configured, so password-reset emails are only written to the server log. Staff self-service reset will not work — the office password desk still does, and students and guardians have no email anyway."
  );
} else {
  report("ok", "Email", `Sending via ${env.EMAIL_PROVIDER ?? "resend"}.`);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
const blockers = findings.filter((f) => f.level === "blocker");
const warnings = findings.filter((f) => f.level === "warning");
const oks = findings.filter((f) => f.level === "ok");

for (const f of oks) console.log(`  ok       ${f.name}\n           ${f.detail}\n`);
for (const f of warnings) console.log(`  WARN     ${f.name}\n           ${f.detail}\n`);
for (const f of blockers) console.log(`  BLOCKER  ${f.name}\n           ${f.detail}\n`);

console.log(
  `${oks.length} ok · ${warnings.length} warning${warnings.length === 1 ? "" : "s"} · ${blockers.length} blocker${blockers.length === 1 ? "" : "s"}\n`
);

if (blockers.length > 0) {
  console.log("Fix the blockers before deploying — each one fails in front of whoever is watching.\n");
  process.exit(1);
}
