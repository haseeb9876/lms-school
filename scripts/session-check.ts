/**
 * End-to-end checks on the session lifetime policy, run against a live
 * server.
 *
 * The unit tests cover the pure decisions (classify this user-agent, is this
 * deadline past). What they cannot cover is the part that actually keeps
 * people signed in or throws them out: cookie scoping, the proxy's redirect
 * to the refresh endpoint, and the fact that rotation copies the deadline
 * forward instead of recomputing it. Those only exist once a real request
 * carries real cookies through the real middleware, so they are checked here.
 *
 *   npm run sessions          (needs the dev server on :3000)
 */
import { PrismaClient } from "@prisma/client";
import { signAccessToken } from "../lib/auth/tokens";
import { hashPassword } from "../lib/crypto/passwords";
import { encryptField, blindIndex } from "../lib/crypto/encryption";

const prisma = new PrismaClient();
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
const PHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";

// A throwaway account, so this never needs a real person's password.
const PROBE_CNIC = "4210100000099";
const PROBE_PASSWORD = "Session-Probe-2026";

/**
 * Login is rate-limited to five attempts per IP per fifteen minutes — which
 * this script would otherwise trip on its second run, since it signs in
 * three times. A per-run source address keeps repeated runs independent
 * without weakening the limiter, and exercises the forwarded-IP path that
 * production actually uses.
 */
const RUN_IP = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

type Jar = Record<string, string>;

function jarFrom(setCookie: string[]): Jar {
  const jar: Jar = {};
  for (const cookie of setCookie) {
    const [pair] = cookie.split(";");
    const eq = pair.indexOf("=");
    jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return jar;
}

function header(jar: Jar): string {
  return Object.entries(jar)
    .filter(([, value]) => value !== "")
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function login(userAgent: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": userAgent,
      "x-forwarded-for": RUN_IP,
      origin: BASE,
    },
    body: JSON.stringify({ identifier: PROBE_CNIC, password: PROBE_PASSWORD }),
  });
  return { res, body: await res.json(), cookies: jarFrom(res.headers.getSetCookie()) };
}

async function main(): Promise<void> {
  await prisma.user.deleteMany({ where: { cnicHash: blindIndex(PROBE_CNIC) } });
  const user = await prisma.user.create({
    data: {
      cnic: encryptField(PROBE_CNIC),
      cnicHash: blindIndex(PROBE_CNIC),
      name: "Session Probe",
      role: "TEACHER",
      passwordHash: await hashPassword(PROBE_PASSWORD),
    },
  });

  try {
    console.log("\n1. A computer gets a 24-hour ceiling");
    const desktop = await login(DESKTOP_UA);
    check("login succeeds", desktop.res.status === 200, String(desktop.res.status));
    check("classified DESKTOP", desktop.body.device === "DESKTOP", JSON.stringify(desktop.body.device));
    check("session hint cookie set", desktop.cookies["lms_session"] === "d");

    const desktopRow = await prisma.session.findFirstOrThrow({
      where: { userId: user.id, deviceClass: "DESKTOP" },
      orderBy: { createdAt: "desc" },
    });
    const capHours = desktopRow.absoluteExpiresAt
      ? (desktopRow.absoluteExpiresAt.getTime() - desktopRow.createdAt.getTime()) / 3_600_000
      : null;
    check("deadline is 24h after sign-in", capHours !== null && Math.abs(capHours - 24) < 0.01, `${capHours}h`);

    console.log("\n2. A phone has no ceiling at all");
    const phone = await login(PHONE_UA);
    check("classified MOBILE", phone.body.device === "MOBILE", JSON.stringify(phone.body.device));
    check("session hint cookie set", phone.cookies["lms_session"] === "m");

    const phoneRow = await prisma.session.findFirstOrThrow({
      where: { userId: user.id, deviceClass: "MOBILE" },
      orderBy: { createdAt: "desc" },
    });
    check("no deadline stored", phoneRow.absoluteExpiresAt === null, String(phoneRow.absoluteExpiresAt));
    const phoneDays = (phoneRow.expiresAt.getTime() - phoneRow.createdAt.getTime()) / 86_400_000;
    check("renewable for a year, not a month", phoneDays > 300, `${Math.round(phoneDays)}d`);

    console.log("\n3. An expired access token renews instead of dumping you at sign-in");
    // Exactly what a browser presents after a tab is left open for twenty
    // minutes: dead access token, live refresh token, hint cookie present.
    const stale = { ...desktop.cookies };
    delete stale["access_token"];

    const blocked = await fetch(`${BASE}/students?page=2`, {
      headers: { cookie: header(stale), "user-agent": DESKTOP_UA },
      redirect: "manual",
    });
    const toRefresh = blocked.headers.get("location") ?? "";
    check("proxy redirects to the refresh endpoint", toRefresh.includes("/api/auth/refresh"), toRefresh);
    check(
      "and remembers the destination",
      decodeURIComponent(toRefresh).includes("next=/students?page=2"),
      toRefresh
    );

    const refreshed = await fetch(new URL(toRefresh, BASE), {
      headers: { cookie: header(stale), "user-agent": DESKTOP_UA },
      redirect: "manual",
    });
    const refreshedCookies = jarFrom(refreshed.headers.getSetCookie());
    check("a new access token is issued", Boolean(refreshedCookies["access_token"]), String(refreshed.status));
    check(
      "and it lands back on the original page",
      (refreshed.headers.get("location") ?? "").includes("/students"),
      refreshed.headers.get("location") ?? ""
    );

    const renewed = { ...stale, ...refreshedCookies };
    const afterRenewal = await fetch(`${BASE}/students?page=2`, {
      headers: { cookie: header(renewed), "user-agent": DESKTOP_UA },
      redirect: "manual",
    });
    check("the renewed session loads the page", afterRenewal.status === 200, String(afterRenewal.status));

    console.log("\n4. A rotated refresh token cannot be replayed");
    const replay = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { cookie: header(stale), origin: BASE },
    });
    check("replay refused", replay.status === 401, String(replay.status));

    console.log("\n5. Past 24 hours a computer session is over — no renewal offered");
    // What the browser would be holding on hour 24: a token that verifies
    // but whose deadline has passed.
    const expiredToken = await signAccessToken({
      userId: user.id,
      role: "TEACHER",
      sessionId: desktopRow.id,
      device: "DESKTOP",
      absoluteExpiresAt: new Date(Date.now() - 1000),
    });
    const overdue = await fetch(`${BASE}/dashboard`, {
      headers: { cookie: `access_token=${expiredToken}; lms_session=d`, "user-agent": DESKTOP_UA },
      redirect: "manual",
    });
    const toLogin = overdue.headers.get("location") ?? "";
    check("sent to sign in, not to refresh", toLogin.includes("/login") && !toLogin.includes("refresh"), toLogin);
    check("and told why", toLogin.includes("reason=expired"), toLogin);
    const cleared = jarFrom(overdue.headers.getSetCookie());
    check(
      "stale cookies cleared so it cannot loop",
      cleared["lms_session"] === "" && cleared["access_token"] === ""
    );

    console.log("\n6. A phone at the same elapsed time is untouched");
    const phoneToken = await signAccessToken({
      userId: user.id,
      role: "TEACHER",
      sessionId: phoneRow.id,
      device: "MOBILE",
      absoluteExpiresAt: null,
    });
    const phoneStillIn = await fetch(`${BASE}/dashboard`, {
      headers: { cookie: `access_token=${phoneToken}; lms_session=m`, "user-agent": PHONE_UA },
      redirect: "manual",
    });
    check("phone still gets the page", phoneStillIn.status === 200, String(phoneStillIn.status));

    console.log("\n7. Rotation cannot upgrade a computer to the phone policy");
    // The attack: sign in on the office PC, then claim to be a phone on the
    // renewal to escape the ceiling.
    const office = await login(DESKTOP_UA);
    const officeRow = await prisma.session.findFirstOrThrow({
      where: { userId: user.id, deviceClass: "DESKTOP" },
      orderBy: { createdAt: "desc" },
    });
    const officeStale = { ...office.cookies };
    delete officeStale["access_token"];

    const upgraded = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { cookie: header(officeStale), "user-agent": PHONE_UA, origin: BASE },
    });
    const upgradedBody = await upgraded.json();
    check("still DESKTOP after rotating as a phone", upgradedBody.device === "DESKTOP", JSON.stringify(upgradedBody));

    const rotatedRow = await prisma.session.findFirstOrThrow({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    check(
      "deadline carried forward unchanged",
      rotatedRow.absoluteExpiresAt?.getTime() === officeRow.absoluteExpiresAt?.getTime(),
      `${rotatedRow.absoluteExpiresAt?.toISOString()} vs ${officeRow.absoluteExpiresAt?.toISOString()}`
    );
    check("and it is still not unlimited", rotatedRow.absoluteExpiresAt !== null);

    console.log("\n8. Signing out clears the hint, so nothing retries forever");
    const signedOut = await fetch(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: { cookie: header(desktop.cookies), origin: BASE },
    });
    const afterLogout = jarFrom(signedOut.headers.getSetCookie());
    check("hint cookie cleared", afterLogout["lms_session"] === "", JSON.stringify(afterLogout));

    console.log("\n9. The refresh endpoint is not an open redirect");
    for (const evil of ["//evil.example", "/\\evil.example", "https://evil.example"]) {
      const attempt = await fetch(`${BASE}/api/auth/refresh?next=${encodeURIComponent(evil)}`, {
        headers: { cookie: header(phone.cookies), "user-agent": PHONE_UA },
        redirect: "manual",
      });
      const location = attempt.headers.get("location") ?? "";
      check(`rejects next=${evil}`, !location.includes("evil.example"), location);
    }
  } finally {
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.$disconnect();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
