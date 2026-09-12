# Deployment plan

The full plan, formatted, is `docs/deployment-plan.html` — open it in a browser.
This file is the short version, kept next to the code so it stays in step with it.

**Nothing here has been executed.** The plan is for review first.

## 1. The decision that dominates everything else

Put the application and the database **in the same region**.

Measured with Prisma query logging on: every database query currently costs
**~250 ms**, of which the database's own work is negligible. It is network
time. Pages issue 4–19 queries each, so a page spends seconds waiting before
it renders. Co-located Postgres answers the same query in ~2 ms.

Two rounds of optimisation took the average page from 2.9 s to 1.9 s and are
permanent, but what remains is round trips that genuinely have to happen. No
further code change removes them.

Counter-intuitively, distance from *users* matters much less than distance
from the *database*: a visitor pays their network round trip once per page,
while the server pays its round trip once per query.

## 2. Recommended shape

A **single VPS running the app and Postgres on the same machine**, in or near
Pakistan. The database is then on localhost and the problem above disappears.

The workload is small: the busiest moment of a normal day is ~600 teachers
marking registers over half an hour, and the heaviest moment of the year is
results day. Both are tens of requests per second at most. 4 vCPU / 8 GB RAM /
80 GB SSD covers it. The app is not short of CPU — it is short of proximity to
its database.

The trade is that patching and backups become yours to run. If nobody at the
school can own that, use managed app + managed Postgres **pinned to the same
region**, which costs more and is still correct.

A server inside the school building is not advised: power cuts and consumer
uplinks take the portal down for everyone, including at home.

## 3. Sizing at full roll (15,000 students)

Extrapolated from the current database — 269 students, 6,676 attendance rows,
17 MB.

| | Today | Full roll |
|---|---|---|
| Accounts | 558 | ~31,000 |
| Attendance rows/year | 6,676 | ~3,000,000 |
| Notification rows/year | 79 | ~1,500,000 |
| Database size after year one | 17 MB | ~2–5 GB |

Notifications grow fastest and are worth least — prune beyond a year.

**Rate limiting:** the in-memory fallback is fine on a single VPS (one
process) and wrong anywhere multi-instance, where five login attempts per
15 minutes silently becomes five *per instance*. On any multi-instance host,
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are mandatory.

## 4. Pre-flight

| Setting | Why |
|---|---|
| `JWT_SIGNING_SECRET` | Signs every session. Guessable ⇒ forged sessions for any role. |
| `FIELD_ENCRYPTION_KEY` | Encrypts every CNIC. **Losing it locks out the whole school.** |
| `DATABASE_URL` | Pooled; needs `pgbouncer=true` behind a transaction pooler. |
| `DIRECT_URL` | Unpooled — migrations hang through a transaction pooler. |
| `UPLOAD_DIR` | Logos and datesheet scans. Must survive redeploys. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Staff password reset and email 2FA. |
| `APP_URL` | Goes into reset links. |
| TLS certificate | Session cookies are `secure` in production — **over plain HTTP nobody can sign in at all.** |

`FIELD_ENCRYPTION_KEY` is not recoverable and not derivable. If it is lost,
every stored CNIC is permanently unreadable and every account is locked out —
there is no reset path, because the CNIC *is* the login. Write it down and
store it away from the server before the first real account exists.

## 5. Cutover sequence

Each step gates the next.

1. **Provision and pin the region.** Verify before building on it:
   `psql "$DATABASE_URL" -c "\timing" -c "SELECT 1"`.
   *Gate:* single-digit milliseconds. 200 ms+ means the pinning did not work
   and nothing else is worth doing.
2. **Secrets, TLS, email sender.** `openssl rand -base64 48` and
   `openssl rand -hex 32`, generated on the server, never reused from dev.
   *Gate:* the encryption key exists in a second location, and HTTPS serves.
3. **Schema and the principal.** `prisma migrate deploy` — never `migrate dev`,
   which can reset data. Seed the principal only; no demo data on production,
   ever. *Gate:* the principal can sign in over HTTPS.
4. **Set up the school before the people.** Year, terms, classes, sections,
   subjects, fee categories, branding. Students cannot be enrolled into classes
   that do not exist. *Gate:* every real class exists with its correct name.
5. **Staff pilot — 20 teachers, two weeks.** Real attendance, real assignments,
   real marks. No students or guardians yet. This phase finds the problems,
   with nothing visible to 15,000 families. *Gate:* two weeks, no blocker.
6. **One grade of students and guardians.** Watch the office counter: how long
   handover takes, how many come back unable to sign in, whether the password
   desk holds up under a queue. *Gate:* the office can process the queue.
7. **The rest, grade by grade.** Each grade is a fresh chance to stop.

## 6. Backups

- Nightly `pg_dump`, **off the machine**.
- 30 daily copies, 12 monthly — corruption is usually noticed weeks later.
- Back up `UPLOAD_DIR` too; scans are not in the database.
- **Restore one before go-live.** An untested backup is a belief.
- Store the encryption key separately from the backups. A dump restored
  without its key is unreadable — which is the point, and also the trap.

## 7. After go-live

Watch `/api/health` (built in), page response times, `LOGIN_FAILED` in
`AuditLog`, password-desk resets (`via: recovery-desk`), and database size.

Run the verification suite against production once after go-live and after
every deploy:

```
npm run verify
```

That runs, in order: typecheck, 69 unit tests, auth coverage (every route and
action is protected), RBAC data scoping, 91 route/role smoke checks, the
session policy, the password desk, and datesheet scoping.

Point it at a running server — `SMOKE_BASE_URL=https://… npm run smoke` for a
deployed one.

`smoke`, `sessions` and `recovery` create and delete a temporary probe
account — safe on production, but they do write. Run them knowingly.

## 8. Decisions still needed

1. Who owns the server (patching, confirming backups ran)?
2. What is the domain?
3. Where does the encryption key live — not the server, not with the backups?
4. How do students and guardians receive credentials? Printed slips at the
   office is what the app assumes and what phase 6 tests.
5. Which grade goes first? Ideally one with engaged parents and a class
   teacher who reports problems rather than working around them.
6. When? The start of a term, so attendance and fees both begin cleanly.
