# Operations

## Database backups

No backup automation is set up in this repo (MongoDB runs in a plain Docker container in dev,
with no managed-service equivalent configured yet for production). Before going live:

- Point `MONGODB_URI` at **MongoDB Atlas** (or an equivalent managed service) rather than a
  self-hosted container — Atlas' continuous backup / point-in-time restore covers this without
  custom scripting.
- If self-hosting instead, run `mongodump` on a schedule and retain: 7 daily, 4 weekly,
  12 monthly snapshots, stored off the database host. Test a restore periodically — an
  untested backup is not a backup.
- `Redis` (BullMQ queues) does not need durable backups — jobs are transient (emails,
  reminders); losing the queue at worst delays a notification, it never loses billing/license
  state, which lives entirely in Mongo.

## Required environment variables

`apps/api/index.ts` fails to start (loudly, on purpose) if these are unset — see
`src/services/authService.ts` and `src/index.ts`:

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — no insecure fallback outside `NODE_ENV=test`.

Everything else in `apps/api/.env.example` / `apps/worker/.env.example` is optional with a
dev-safe default (e.g. no `RESEND_API_KEY` → emails log to console instead of sending).

## Security items intentionally deferred (not silently skipped)

- **HMAC/signed requests on `/api/payments/*`**: the plugin's `CG_Backend_API` does not
  currently send a signature, nonce, or timestamp — only a `license_key` + `site_url`. Adding
  server-side signature verification here would just reject every real request until the
  plugin is *also* updated to sign them. This needs a coordinated two-sided change (plugin +
  platform), not something this repo can do alone. Tracked in `docs/API.md`'s plugin-contract
  section.
- **Razorpay / Lemon Squeezy payment providers**: scaffolded as interface-only stubs
  (`apps/api/src/services/payments/`) that throw if called. Stripe is the only live provider.

## Structured logging

`apps/api` uses `pino` (`src/logger.ts`) — pretty-printed in dev, JSON in production, silent
in tests. `pino-http` logs every request. Point production log output at whatever the hosting
platform expects (most PaaS providers capture stdout automatically — no extra transport
needed unless shipping to a dedicated log service).
