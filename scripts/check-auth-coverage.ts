#!/usr/bin/env tsx
/**
 * Fails the build when a server-side entry point can be reached without an
 * authorization check. Two kinds of entry point exist in this app and both
 * are checked here:
 *
 *   1. API routes  — app/api/**\/route.ts must export handlers wrapped in
 *      withAuth(...).
 *   2. Server Actions — any file marked "use server" must export only
 *      functions produced by withAction(...).
 *
 * Server Actions matter just as much as routes: Next.js exposes each one as
 * a callable POST endpoint, so an unwrapped action is an unauthenticated
 * mutation endpoint even if the only button that calls it is behind a
 * principal-only page.
 *
 * A forgotten check should break CI, not ship a silent hole.
 */
import fs from "node:fs";
import path from "node:path";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/**
 * The genuinely public auth endpoints — they can't require a session
 * because they're how a session gets created in the first place.
 */
const PUBLIC_ROUTES = new Set([
  "app/api/auth/login/route.ts",
  "app/api/auth/refresh/route.ts",
  "app/api/auth/2fa/verify/route.ts",
  "app/api/auth/password-reset/request/route.ts",
  "app/api/auth/password-reset/confirm/route.ts",
  "app/api/health/route.ts",
  // Serves the school logo and building photo, which appear on the public
  // welcome and login screens. Bounded to the branding folder — anything
  // else 404s whether or not it exists.
  "app/api/files/[...path]/route.ts",
]);

const IGNORED_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build"]);

function walk(dir: string, predicate: (file: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      results.push(...walk(path.join(dir, entry.name), predicate));
    } else if (entry.isFile() && predicate(entry.name)) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function relative(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function checkRouteFile(filePath: string): string[] {
  const relPath = relative(filePath);
  if (PUBLIC_ROUTES.has(relPath)) return [];

  const source = fs.readFileSync(filePath, "utf8");
  const violations: string[] = [];

  for (const method of HTTP_METHODS) {
    if (new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`).test(source)) {
      violations.push(`${relPath}: exports ${method} as a raw function instead of withAuth(...)`);
      continue;
    }

    const match = source.match(new RegExp(`export\\s+const\\s+${method}\\s*=\\s*([^;\\n]+)`));
    if (match && !/withAuth\s*\(/.test(match[1])) {
      violations.push(`${relPath}: exports ${method} without wrapping it in withAuth(...)`);
    }
  }

  return violations;
}

/** True when the file opts the whole module into Server Action semantics. */
function isUseServerModule(source: string): boolean {
  // Only a directive in the module prologue counts — a "use server" appearing
  // later (inside a function body, or in a comment) does not mark the module.
  const prologue = source.slice(0, 400);
  return /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*|\n)*["']use server["']/.test(prologue);
}

function checkActionFile(filePath: string): string[] {
  const source = fs.readFileSync(filePath, "utf8");
  if (!isUseServerModule(source)) return [];

  const relPath = relative(filePath);
  const violations: string[] = [];

  // `export async function foo()` inside a "use server" module is a Server
  // Action with no wrapper around it at all.
  for (const match of source.matchAll(/export\s+async\s+function\s+(\w+)\s*\(/g)) {
    violations.push(
      `${relPath}: exports Server Action '${match[1]}' as a raw async function instead of withAction(...)`
    );
  }

  for (const match of source.matchAll(/export\s+const\s+(\w+)\s*(?::[^=]+)?=\s*([\s\S]{0,120})/g)) {
    const [, name, rhs] = match;
    if (!/withAction\s*\(/.test(rhs)) {
      violations.push(`${relPath}: exports Server Action '${name}' without wrapping it in withAction(...)`);
    }
  }

  return violations;
}

function main() {
  const routeFiles = walk(path.join(process.cwd(), "app/api"), (name) => name === "route.ts");
  const sourceFiles = [
    ...walk(path.join(process.cwd(), "app"), (name) => /\.tsx?$/.test(name)),
    ...walk(path.join(process.cwd(), "lib"), (name) => /\.tsx?$/.test(name)),
    ...walk(path.join(process.cwd(), "components"), (name) => /\.tsx?$/.test(name)),
  ];

  const violations = [
    ...routeFiles.flatMap(checkRouteFile),
    ...sourceFiles.flatMap(checkActionFile),
  ];

  if (violations.length > 0) {
    console.error("\n✖ Auth coverage check failed — these server entry points are not protected:\n");
    for (const v of violations) console.error(`  - ${v}`);
    console.error(
      "\nAPI routes must be wrapped in withAuth(...); Server Actions must be wrapped in withAction(...).\n" +
        "If a route is genuinely meant to be public, add it to PUBLIC_ROUTES in scripts/check-auth-coverage.ts.\n"
    );
    process.exit(1);
  }

  const actionModules = sourceFiles.filter((f) => isUseServerModule(fs.readFileSync(f, "utf8")));
  console.log(
    `✓ Auth coverage check passed (${routeFiles.length} route files, ${actionModules.length} action modules scanned).`
  );
}

main();
