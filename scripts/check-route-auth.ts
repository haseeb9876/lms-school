#!/usr/bin/env tsx
/**
 * Fails the build if any app/api/**\/route.ts exports an HTTP handler that
 * isn't wrapped in withAuth(...) — the structural fix for the old app's
 * biggest failure, where every API route had zero auth checks. A forgotten
 * check should break CI, not ship a silent hole.
 *
 * A small explicit allowlist covers the genuinely public auth endpoints
 * (login, refresh, password reset, health) that can't require a session
 * because they're how a session gets created in the first place.
 */
import fs from "node:fs";
import path from "node:path";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const PUBLIC_ROUTES = new Set([
  "app/api/auth/login/route.ts",
  "app/api/auth/refresh/route.ts",
  "app/api/auth/2fa/verify/route.ts",
  "app/api/auth/password-reset/request/route.ts",
  "app/api/auth/password-reset/confirm/route.ts",
  "app/api/health/route.ts",
]);

function findRouteFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(full));
    } else if (entry.isFile() && entry.name === "route.ts") {
      results.push(full);
    }
  }
  return results;
}

function checkFile(filePath: string): string[] {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  if (PUBLIC_ROUTES.has(relPath)) return [];

  const source = fs.readFileSync(filePath, "utf8");
  const violations: string[] = [];

  for (const method of HTTP_METHODS) {
    const declaredAsFunction = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`).test(source);
    if (declaredAsFunction) {
      violations.push(`${relPath}: exports ${method} as a raw function instead of withAuth(...)`);
      continue;
    }

    const constExportPattern = new RegExp(`export\\s+const\\s+${method}\\s*=\\s*([^;\\n]+)`);
    const match = source.match(constExportPattern);
    if (match) {
      const rhs = match[1];
      if (!/withAuth\s*\(/.test(rhs)) {
        violations.push(`${relPath}: exports ${method} without wrapping it in withAuth(...)`);
      }
    }
  }

  return violations;
}

function main() {
  const routeFiles = findRouteFiles(path.join(process.cwd(), "app/api"));
  const violations = routeFiles.flatMap(checkFile);

  if (violations.length > 0) {
    console.error("\n✖ Route auth check failed — the following handlers are not protected by withAuth():\n");
    for (const v of violations) console.error(`  - ${v}`);
    console.error(
      "\nIf this route is genuinely meant to be public, add it to PUBLIC_ROUTES in scripts/check-route-auth.ts.\n"
    );
    process.exit(1);
  }

  console.log(`✓ Route auth check passed (${routeFiles.length} route files scanned).`);
}

main();
