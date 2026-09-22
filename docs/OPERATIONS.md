# Operations

## Production topology

- **Web**: Vercel (`https://techlovev.myimage.fun`) — separate deploy target from the VPS.
- **API + worker**: Hostinger VPS, PM2 (`ecosystem.config.js` runs only `api` and `worker` —
  `web` was removed once the frontend moved to Vercel), Nginx reverse-proxying
  `https://tlvapi.myimage.fun` → `127.0.0.1:4000`.
- **DNS**: `myimage.fun`'s nameservers are Cloudflare's, *not* Hostinger's — Hostinger's own DNS
  Zone Editor has no effect even though the VPS is hosted there. Manage records in the
  Cloudflare dashboard instead.
  - **Both `tlvapi` and `techlovev` records must be DNS-only (grey cloud), not proxied
    (orange cloud).** A proxied `techlovev` breaks Vercel's edge routing (shows as "Proxy
    Detected" in the Vercel dashboard). A proxied `tlvapi` still lets Certbot issue a cert
    (Let's Encrypt validates externally) but is unnecessary indirection for a plain API origin.
- **MongoDB**: Atlas — the VPS's outbound IP must be in Atlas's Network Access allowlist, or
  every request fails with `MongooseServerSelectionError` / `ReplicaSetNoPrimary` (api stays
  "online" in `pm2 status` but 502s at Nginx since it can't actually serve requests).
- **Redis**: Redis Cloud. Set the database's eviction policy to `noeviction` — BullMQ logs
  `IMPORTANT! Eviction policy is volatile-lru. It should be "noeviction"` on every connection
  otherwise (not fatal, but job data can silently drop under memory pressure with the default).

## Database backups

- MongoDB Atlas' continuous backup / point-in-time restore covers this without custom
  scripting — already the production `MONGODB_URI` target, nothing further to configure.
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
