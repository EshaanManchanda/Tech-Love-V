# API Reference

Full interactive docs (generated from `apps/api/src/openapi.ts`): run the API and open
**`GET /api/docs`** (Swagger UI), or fetch the raw spec at `GET /api/openapi.json`.

This file is the human-readable map — what exists, who calls it, and why it's shaped the way it is.

## Auth model

Two completely separate trust boundaries share this API:

1. **Cookie session auth** (`access_token` / `refresh_token` httpOnly cookies, JWT, 15m/7d)
   — used by the Next.js web app (customer + admin portals). Role is `customer` or `admin`;
   `requireAdmin` gates every `/api/admin/*` route.
2. **Unauthenticated, rate-limited** — the four `/api/payments/*` routes the WordPress plugin
   calls directly. No cookie, no API key today; protected only by `express-rate-limit`
   (60/min) and knowledge of a valid `license_key`. This is intentional and matches the
   plugin's actual `CG_License_Manager`/`CG_Backend_API` client code — see
   [Plugin contract](#plugin-contract) below before changing anything here.

## Endpoint groups

| Group | Base path | Auth |
|---|---|---|
| Auth | `/api/auth/*` | none → cookie |
| Plans | `/api/plans/*` | none (public pricing data) |
| Billing | `/api/checkout`, `/api/billing`, `/api/webhooks/stripe` | cookie / Stripe signature |
| Licenses | `/api/licenses/*` | cookie |
| Subscriptions | `/api/subscriptions/*` | cookie |
| Organizations | `/api/organizations/*` | cookie |
| Downloads | `/api/downloads/*` | cookie |
| API Keys | `/api/api-keys/*` | cookie |
| Notifications | `/api/notifications/*` | cookie |
| Support | `/api/support/*` | cookie (role-branches inside) |
| Admin | `/api/admin/*` | cookie + admin role |
| **Plugin contract** | `/api/payments/*` | none (rate-limited) |

## Plugin contract

Verified directly against the plugin's real source
(`includes/Core/license-manager.php`, `includes/Payment/backend-api.php`,
`includes/API/payment-endpoints.php`) — not assumptions. Do not change these four routes'
request/response shape without also checking those files:

- `POST /api/payments/activate-remote` — the only route the plugin's
  `CG_License_Manager::remote_validate()` actually calls, for **both** initial activation
  and the twice-daily heartbeat cron. Must stay idempotent per `(license_key, site_url)`.
- `POST /api/payments/deactivate-remote` — always returns `{success:true}`, even for an
  unknown key, matching the plugin's fire-and-forget expectation.
- `POST /api/payments/usage` — always `204`, 1s timeout on the plugin side. Never let this
  block or throw in a way that delays the response.
- `POST /api/payments/verify-license` — defined for parity with `CG_Backend_API::verify_license()`
  but **not currently called** by the plugin. Don't build new features assuming it's live traffic.

License keys are generated with a plan-scoped prefix (`PRO-XXXX-XXXX-XXXX-XXXX` for Pro,
`BIZ-XXXX-XXXX-XXXX-XXXX` for Business, `DT-XXXX-XXXX-XXXX-XXXX` for Dynamic Tags) — see
`generateLicenseKey()` in `services/licenseService.ts`. The prefix matches what the plugin's
local offline fallback expects when no license server is configured, so a key issued here stays
valid even if a plugin install ever falls back to that path.

`customer.subscription.deleted` intentionally does **not** touch the `License` — expiry rides
out to the already-set `expires_at` (MERN plan's "never break existing certificates" rule).
Don't "fix" this into instant revocation.

## Client SDK

`packages/sdk` is a thin TypeScript client for the four plugin-facing endpoints above
(`CertificateLicenseClient`) — useful for scripts, tests, or a future non-WordPress
integration. Not published to npm; workspace-internal only, `npm run build -w packages/sdk`.

## Adding a new endpoint

1. Add the route + zod validation in `apps/api/src/routes/`.
2. Add a Vitest + Supertest test in `apps/api/src/__tests__/` (real Mongo, see existing files
   for the pattern — `fileParallelism: false` in `vitest.config.ts` because tests share one DB).
3. Add the path to `apps/api/src/openapi.ts` so `/api/docs` stays accurate.
