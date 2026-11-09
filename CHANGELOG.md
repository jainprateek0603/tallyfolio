# Changelog

## 1.2.0 — 2026-11-09

### Added
- **Accounts:** email and password sign-in and registration with Auth.js (NextAuth v5), JWT sessions and the Prisma adapter. Google sign-in turns on when `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `NEXT_PUBLIC_GOOGLE_ENABLED=true` are all set.
  - Passwords are hashed with bcrypt (cost 12). Unknown emails take as long as wrong passwords, so a failed sign-in doesn't reveal whether an account exists.
  - Sign-in is rate limited per IP and per email. Registration is rate limited per IP, using `AUTH_RATE_LIMIT` attempts per 15 minutes.
  - Suspended users can't sign in, and an existing session stops working as soon as the account is suspended.
- **Invoice API:**
  - `GET` and `POST /api/invoices`.
  - `GET`, `PATCH` and `DELETE /api/invoices/:id`.
  - `POST /api/invoices/:id/status`.
  - `POST /api/register`.
- **Invoice rules:**
  - Each user gets their own `INV-####` numbers.
  - Free plan limits are enforced, and every client and project must belong to the user.
  - Only drafts can be edited or deleted.
  - Status changes follow `invoice-status.ts`. Marking an invoice sent creates its pay-link token, and moving it back to draft revokes the token.
  - Overdue is worked out from the due date, so the Overdue and Sent filters compare due dates.
- **Pages:** sign in, register, an invoice list with search, status filter and pagination, invoice detail with status actions, and new/edit forms with live totals. They work on phones and in light and dark mode.
- **Tests:** 18 integration tests run against `prisma/test.db`, which the suite rebuilds before each run. CI now runs them.
- `parseHundredths`, `formatHundredths` and `formatQuantity` convert between typed decimals and stored integers.

### Security
- Next.js is upgraded from 16.4.0 to 16.4.5 for GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r and GHSA-673q-mjm6-r5xr.
- Still open: `npm audit` reports a high-severity issue in `deepmerge-ts`, which comes in through the Prisma CLI. The fix needs Prisma 7, a major upgrade.

### Known gaps
- Rate limits are counted in memory, so each server instance counts separately and a restart resets them. Use a shared store before running more than one instance.
- There are no pages yet for clients, projects, tasks, settings, Stripe, the public pay link, cron, email, exports or AI drafts.

## 1.1.0 — 2026-11-09

### Fixed
- **PATCH requests no longer reset fields.** In Zod 4, `.partial()` keeps `.default()` values, so updating only a project's name set its status back to `ACTIVE`, and updating a task reset its status to `TODO` and priority to `MEDIUM`. Update schemas are now built from fields without defaults.
- **Build and typecheck:** `src/lib/http.ts` imported `@/lib/log`, which did not exist. Added `log.ts` with `captureException`, which logs and, when `SENTRY_DSN` is set, posts to Sentry's store API. Reporting never throws.
- **`npm run db:seed` / `db:setup`:** added the missing `prisma/seed.ts`. It creates the three demo accounts listed in the README and can be re-run safely.
- **Invoice updates** now reject a due date before the issue date when both are sent, and accept `lateFeeBps` and `currency` like create does. Blank `notes` become `null`.
- **Passwords** are limited to 72 *bytes* instead of 72 characters, because bcrypt ignores anything after 72 bytes. Multibyte passwords were silently truncated before.
- Added `scripts/set-db-provider.mjs`, which the Prisma schema refers to, for switching between SQLite and PostgreSQL.

### Changed
- `schemas.ts`: shared helpers for currency codes, basis points, cents, list pagination and "provide a field" checks replace about 15 copies.
- `page-query.ts`: one typed reader replaces five near-identical functions.
- `invoice-status.ts` reuses `startOfUtcDay`. Removed the unused `flattenIssues` from `params.ts`.

### Added
- Vitest config with the `@/` alias, plus 40 unit tests in `tests/unit` for schemas, dates, invoice math, statuses, money, plan limits, page queries, the Sentry DSN parser and the HTTP helpers (`ok`, `readJson`, `parseBody`, `parseQuery`, `handleError`).
- `mergeInvoiceDates` in `src/lib/invoice-dates.ts` checks an invoice update's dates against the stored ones, for when a request sends only one date.
- GitHub Actions CI runs typecheck, lint, unit tests and the seed on every PR and on pushes to `main`.
- Dependabot opens weekly update PRs for npm packages (minor and patch grouped) and GitHub Actions.
- `.nvmrc` and `engines.node >= 24` pin the Node version. `.gitattributes` keeps text files LF on every OS.

### Known gaps
- The app routes and pages under `src/app`, auth, Stripe, cron, email, AI and exports described in the README are not in this repository.
- `tests/integration` and Playwright tests do not exist yet, so `npm run test:integration` and `npm run test:e2e` have nothing to run.
- Invoice update routes must call `mergeInvoiceDates`. Those routes are not in the repository yet.
