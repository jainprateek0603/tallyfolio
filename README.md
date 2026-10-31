# Tallyfolio

Tallyfolio is a ledger for independent work: clients, projects, tasks, and invoices, with a Free plan and a Stripe Pro subscription.

Sent invoices have a public pay link. The cron route also creates recurring invoices and adds a late fee once an invoice is overdue. Time can be billed onto a draft. Expenses reduce the profit figure on the dashboard. Clients, invoices, and expenses export as CSV or Excel. Without an `AI_API_KEY`, invoice drafts, reminder tones, and questions such as “unpaid invoices from last month” stay on this machine.

## Setup

Requires Node.js 24 and npm.

```powershell
git clone https://github.com/jainprateek0603/tallyfolio.git
cd tallyfolio
Copy-Item .env.example .env
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000.

`npm install` runs `prisma generate`. `npm run db:setup` creates the SQLite file at `prisma/dev.db` and loads the demo data. Edit `.env` before you use Google, Stripe, or Resend. The values in `.env.example` are placeholders.

## Demo accounts

Created by `npm run db:seed`. These are local demo passwords, not production secrets.

| Email | Password | Access |
| --- | --- | --- |
| alex@tallyfolio.test | DemoPass123! | Pro user, sample clients and invoices |
| sam@tallyfolio.test | DemoPass123! | Free user, near the plan limits |
| admin@tallyfolio.test | AdminPass123! | Admin |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma generate` and a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | API tests against `prisma/test.db` |
| `npm run test:e2e` | Playwright (installs a browser on first use) |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:push` | Push the schema to `DATABASE_URL` |
| `npm run db:migrate` | Apply the checked-in SQLite migration |
| `npm run db:seed` | Seed demo data |
| `npm run db:setup` | Push, then seed |
| `npm run db:reset` | Drop, migrate, and seed the SQLite database |

## Database

Local development uses SQLite (`DATABASE_URL="file:./dev.db"`, relative to `prisma/`). Production Postgres is a provider switch, not a replay of the SQLite migration. See `DECISIONS.md`.

```powershell
node scripts/set-db-provider.mjs postgresql
```

Set `DATABASE_URL` to the Postgres URL, then `npx prisma db push`. To go back: `node scripts/set-db-provider.mjs sqlite`.

## Plans

Free: 3 active clients and 5 invoices. PDF export stays available. Pro: unlimited clients and invoices, and overdue reminder email. Limits are enforced on the server.

## Environment

See `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLite file or Postgres URL |
| `AUTH_SECRET` | Yes | Auth.js session secret |
| `AUTH_URL` | Production | Public origin |
| `AUTH_TRUST_HOST` | Behind a proxy | `true` on Vercel or Docker |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google sign-in |
| `NEXT_PUBLIC_GOOGLE_ENABLED` | No | `true` shows the Google button |
| `STRIPE_SECRET_KEY` | Billing | Test secret key |
| `STRIPE_WEBHOOK_SECRET` | Billing | Webhook signing secret |
| `STRIPE_PRICE_ID` | Billing | Pro subscription price |
| `NEXT_PUBLIC_APP_URL` | Yes | Origin used for Checkout return URLs |
| `CRON_SECRET` | Yes | Bearer token for reminder cron |
| `EMAIL_PROVIDER` | No | `console` (default) or `resend` |
| `RESEND_API_KEY` / `EMAIL_FROM` | Resend | Sending credentials |
| `AUTH_RATE_LIMIT` | No | Auth attempts per 15 minutes (default 10) |

## More

- `ARCHITECTURE.md` — structure, flows, schema
- `API.md` — HTTP API
- `DEPLOYMENT.md` — Docker or Vercel, Postgres, Stripe, cron
- `SECURITY.md` and `PERFORMANCE.md`
- `DECISIONS.md` — why the stack looks like this

## License

MIT. See `LICENSE`.
