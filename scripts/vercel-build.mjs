/**
 * The build Vercel runs.
 *
 * Vercel prefers a `vercel-build` script over `build` when one exists, and
 * this is here for exactly one reason: **migrations have to run somewhere.**
 *
 * Without that step a deploy ships new code against an old schema, and the
 * result is a page that throws `Cannot read properties of undefined` on a
 * Prisma model that does not exist yet — served as an HTTP 200 with the
 * error inside, because the shell has already streamed. That failure is
 * invisible to a status-code check and shows up in front of whoever is
 * watching the demo. It has already happened once in development.
 *
 * `prisma migrate deploy` needs DIRECT_URL: it opens a real session, and a
 * transaction pooler cannot hold one, so it hangs through the pooled host.
 * When DIRECT_URL is absent the migration step is skipped rather than failing
 * the build — a deploy that refuses to run is worse than one that ships
 * against an already-current database — but it is skipped *loudly*, because
 * the next schema change will break silently if nobody acts on it.
 */
import { spawnSync } from "node:child_process";

const GREY = "[2m";
const YELLOW = "[33m";
const RED = "[31m";
const RESET = "[0m";

function run(command, args) {
  console.log(`${GREY}$ ${command} ${args.join(" ")}${RESET}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });

  if (result.status !== 0) {
    console.error(`${RED}\nBuild step failed: ${command} ${args.join(" ")}${RESET}`);
    process.exit(result.status ?? 1);
  }
}

function banner(color, lines) {
  const width = Math.max(...lines.map((line) => line.length)) + 4;
  console.log(`${color}${"═".repeat(width)}`);
  for (const line of lines) console.log(`  ${line}`);
  console.log(`${"═".repeat(width)}${RESET}\n`);
}

// The client must be generated before anything imports it, including the
// migration step and the type-check inside `next build`.
run("npx", ["prisma", "generate"]);

if (process.env.DIRECT_URL) {
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  banner(YELLOW, [
    "DIRECT_URL is not set — skipping database migrations.",
    "",
    "This deploy ships whatever schema the database already has. That is",
    "fine only while the database is already up to date; the next schema",
    "change will deploy code that expects tables the database does not",
    "have, and those pages will throw at runtime.",
    "",
    "Fix: add DIRECT_URL to the project's environment variables. It is the",
    "same Neon connection string as DATABASE_URL with the '-pooler' removed",
    "from the host, because migrations need a real session that a",
    "transaction pooler cannot hold.",
  ]);
}

// Fails the build if any route handler or Server Action is unprotected.
run("npm", ["run", "check:auth"]);

run("npx", ["next", "build"]);
