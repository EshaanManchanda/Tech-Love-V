# Certificate Generator License Platform

Licensing, billing, and customer/admin portals for the Certificate Generator WordPress plugin.

- **`apps/web`** — Next.js. Public marketing site (`app/(public)/`: home, `/pricing`, `/docs`,
  `/login`, `/register`) plus the **Customer Portal** (`/dashboard/*`) and **Admin Portal**
  (`/admin/*`).
- **`apps/api`** — Express + MongoDB. See [`docs/API.md`](docs/API.md) for the full endpoint
  reference, or run it and open `GET /api/docs` for interactive Swagger UI. The
  `/api/payments/*` routes are the exact unauthenticated contract the WordPress plugin calls —
  verified against the plugin's real source, not assumptions.
- **`apps/worker`** — BullMQ background jobs (transactional email, renewal reminders) against
  Redis.
- **`packages/sdk`** — thin TS client for the plugin-facing endpoints (scripts/tests; not
  published).

## Local dev

```bash
docker compose up -d mongo redis        # Mongo on :27017, Redis on :6379
cp apps/api/.env.example apps/api/.env            # fill in Stripe keys when ready
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.local.example apps/web/.env.local
npm install
npm run dev:api      # http://localhost:4000
npm run dev:web       # http://localhost:3000 (or :3001 if :3000 is busy — Next auto-increments)
npm run dev:worker     # background jobs; optional for just browsing the site
```

First time only — seed the DB-driven pricing/feature data the `/pricing` page reads:

```bash
npm run seed:plans -w apps/api
```

Visit `/` for the home page, `/pricing` for plans, `/login` · `/register` for auth, and
`/dashboard` · `/admin` once signed in. To grant yourself admin access:

```bash
npm run set-user-role -w apps/api -- you@example.com admin
```

> **Don't run `npm run build -w apps/web` while `npm run dev:web` is still running** — both
> processes write to `apps/web/.next` and racing them corrupts the build (`PageNotFoundError`,
> stale-chunk 404s, unstyled pages). Stop the dev server first, or delete `apps/web/.next` and
> restart if you hit this.

## Tests

```bash
docker compose up -d mongo redis
npm run test:api
```

Real Mongo, not an in-memory DB — `vitest.config.ts` runs test files serially
(`fileParallelism: false`) since they share one database.

## Pointing a local WordPress install at this API

In wp-admin: Settings → Certificate Generator → License tab → set "License Server URL" to
`http://localhost:4000`. No plugin code changes needed.

## Stripe

Only the **Pro** plan is sold through Stripe Checkout — `/pricing` sends Business customers to
a "Contact us" link instead, matching the plugin's own pricing page.

```bash
npm run stripe:setup-prices -w apps/api   # creates the $3.5/mo · $35/yr Pro Prices, prints the env vars
```

Then set `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY` in `apps/api/.env`, and point a
webhook at `POST /api/webhooks/stripe` for `checkout.session.completed`, `invoice.paid`,
`customer.subscription.deleted`.

## More docs

- [`docs/API.md`](docs/API.md) — endpoint reference, auth model, the plugin contract
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md) — backups, required env vars, deferred security items
