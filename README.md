# School LMS

A learning management and student information system for schools in Pakistan.
Four roles — principal, teacher, student and guardian — each get their own
view of the same school: registers, assignments, marks, fees and notices.

Built with Next.js (App Router), PostgreSQL via Prisma, and Tailwind.

## Getting started

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and the two secrets
npx prisma migrate deploy
npm run db:seed           # creates the first principal account
npm run dev
```

Open http://localhost:3000 and sign in with the CNIC and password printed by
the seed. You'll be asked to change the password on first sign-in.

### A school to look at

`npm run db:seed` gives you an empty school, which is the right starting point
for a real deployment but a poor one for evaluating the app — most screens are
views over related records, so an empty database renders empty boxes.

```bash
npm run db:seed:demo
```

builds a complete demo school: 267 students across 15 sections, 18 teachers,
a term of attendance, graded assignments, exam results, fee invoices and
announcements. It prints sign-in details for one account of each role when it
finishes.

**It clears existing academic data first.** It refuses to run when
`NODE_ENV=production` unless `ALLOW_DEMO_SEED=yes` is also set.

## Setting up a real school

The app needs its academic structure before anything else works. **Academic
Setup** (principal only) walks through it in the order it has to be done:

1. **Year & terms** — one academic year is current at a time; terms group
   exams and fee invoices within it.
2. **Classes** — a class is a grade level (Grade 9); a section is the group
   students are actually enrolled into (Grade 9 — A).
3. **Subjects** — shared across the school; what varies is who teaches them.
4. **Staffing** — which teacher takes which subject in which section. This is
   the permission model, not just a record: a teacher can only mark registers
   and enter marks for the classes listed here.

Then add teachers from **Teachers** and enrol students from **Students**.
Enrolling a student creates their account, their guardian's, and the link
between them in one step.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (runs the auth coverage check first) |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests (Vitest) |
| `npm run smoke` | Signs in as each role and requests every route |
| `npm run check:auth` | Fails if a route or Server Action is unprotected |
| `npm run db:migrate` | Apply migrations in development |
| `npm run db:seed` | First principal account |
| `npm run db:seed:demo` | Full demo school (destructive) |
| `npm run db:studio` | Prisma Studio |

## How authorization works

Two structural rules, both enforced at build time by
`scripts/check-auth-coverage.ts`:

- **Every API route** is wrapped in `withAuth(roles, handler)`.
- **Every Server Action** is wrapped in `withAction({ roles, input }, handler)`.

Server Actions matter as much as routes here: Next.js exposes each one as a
callable POST endpoint, so an unwrapped action is an unauthenticated mutation
endpoint even if the only button that calls it sits behind a principal-only
page. The check fails the build for either, so a forgotten wrapper breaks CI
rather than shipping a hole.

Role checks alone don't stop a parent viewing another parent's child, or a
teacher touching a class they don't teach. The helpers in `lib/auth/rbac.ts`
derive the permitted set server-side from the session; a client-supplied id
only ever *narrows* what's visible. Pages run those checks through
`guardPage()`, which turns a refusal into a redirect to `/unauthorized`
instead of an error page.

`npm run smoke` verifies both directions — that each role can reach what it
should, and is refused what it shouldn't.

## Data protection

- CNICs are encrypted at rest with AES-256-GCM and a per-value IV. Because
  that ciphertext can't be queried, lookups and uniqueness go through a
  deterministic HMAC "blind index" (`lib/crypto/encryption.ts`).
- Passwords are bcrypt at cost 12. Temporary passwords issued when creating an
  account are shown once and never stored in readable form.
- Sessions are database-backed refresh tokens, so logout-everywhere and
  admin-forced logout actually end a session rather than waiting for a token
  to expire. Suspending an account revokes its sessions immediately.
- Two-factor authentication is available per account (TOTP or email OTP), with
  single-use recovery codes.
- Sensitive mutations and student-record views are written to an audit log.

## Notes

- Dates are handled in the school's own timezone (Asia/Karachi), not the
  server's. Deriving "today" from UTC would offer teachers yesterday's date
  for the register during the hours when Karachi has rolled over and UTC
  hasn't.
- Chart series colours are a validated set — checked for lightness, chroma,
  colour-blind separation and contrast rather than chosen by eye — and every
  chart carries a legend and a table view so nothing rests on colour alone.
- Without Upstash configured, rate limiting falls back to an in-memory limiter.
  That's fine locally but does not work across serverless instances; set
  `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` before deploying.
