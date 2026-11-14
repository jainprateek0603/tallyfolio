# Changelog

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
