# Stripe → Lemon Squeezy migration plan

**Why:** the seller is an individual in India selling worldwide. Lemon Squeezy (LS) is merchant of record: it is the legal seller,
collects and remits VAT / sales tax / GST, and issues invoices. The legal pages (`/terms`, `/privacy`, `/refund-policy`) already say
so and must ship **together with** this migration.

**Decisions (2026-10-12):** pre-launch, no live Stripe subscribers · keep Stripe behind `PAYMENT_PROVIDER` for rollback · hosted
checkout via redirect (no lemon.js overlay) · keep our coupon system, mapped to LS discount codes.

**Unchanged:** our DB stays the source of truth for licenses (never LS's own license-key feature). Licenses, activations, the plugin
endpoints and the plugin itself don't change.

## 1. Provider selection
- `services/payments/index.ts`: `getPaymentProvider()` returns `lemonSqueezyProvider` or `stripeProvider` from
  `PAYMENT_PROVIDER` (default `lemonsqueezy` in prod `.env`, `stripe` kept for tests/rollback).
- `checkout.ts` and the billing portal call `getPaymentProvider()` instead of importing `stripeProvider`.

## 2. `lemonsqueezy.provider.ts` (replace the throwing scaffold)
Plain `fetch` against `https://api.lemonsqueezy.com/v1` (JSON:API; headers `Authorization: Bearer $LEMONSQUEEZY_API_KEY`,
`Accept`/`Content-Type: application/vnd.api+json`). No SDK needed.
- `createCheckout` → `POST /checkouts` with `store_id` (`LEMONSQUEEZY_STORE_ID`), `variant_id` (= our "price id"),
  `checkout_data: { email, discount_code?, custom: { user_id, product, plan, coupon_id? } }`,
  `product_options: { redirect_url: successUrl }`. Return `data.attributes.url`. (LS has no cancel URL; the back link returns to the
  store, acceptable.)
- `getSubscription` → `GET /subscriptions/:id`; map `renews_at`/`ends_at`, `status`, `variant_id`, `cancelled`.
- `createPortal(customerId)` → `GET /customers/:id`, return `data.attributes.urls.customer_portal` (signed, short-lived: fetch on
  every click, never store).
- `cancelSubscription` → `DELETE /subscriptions/:id` (LS cancels at period end); `resumeSubscription` → `PATCH cancelled:false`;
  `upgrade/downgradeSubscription` → `PATCH variant_id` (with `invoice_immediately` for upgrades).
- `verifyWebhook(raw, sig)` → HMAC-SHA256 hex of the raw body with `LEMONSQUEEZY_WEBHOOK_SECRET`, `timingSafeEqual` against the
  `X-Signature` header; returns the parsed JSON.
- `PaymentProvider.ts`: rename `stripeCustomerId` → `providerCustomerId` in `CreateCheckoutParams`; update the doc comment.

## 3. Webhook: `routes/lemonSqueezyWebhook.ts`
Mount at `/api/webhooks/lemonsqueezy` with `express.raw()` before `express.json()` (as Stripe is in `app.ts`). Event name from
`meta.event_name`, our ids from `meta.custom_data`. Share license logic with the Stripe route by moving it into
`services/billingService.ts` (`onSubscriptionStarted`, `onRenewed`, `onPaymentFailed`, `onCancelled`, `onRefunded`), so both
webhooks are thin adapters.

| LS event | Action |
|---|---|
| `subscription_created` | upsert Subscription, create License (`expires_at` = `renews_at` date), email the key, record coupon redemption. Store `customer_id` on the user. |
| `subscription_payment_success` | renewal: fetch the subscription, move `expires_at` to the new `renews_at`, status active. (Skip the first invoice: `billing_reason: "initial"`.) |
| `subscription_payment_failed` | Subscription → `past_due` (LS retries and emails the customer). |
| `subscription_payment_recovered` | Subscription → `active`. |
| `subscription_cancelled` | Subscription `cancel_at_period_end=true`; license runs to its paid-through date. |
| `subscription_resumed` | clear `cancel_at_period_end`. |
| `subscription_expired` | Subscription → `cancelled`/`expired`. |
| `subscription_updated` | sync plan/variant changes (upgrade/downgrade): update License `plan` + `activation_limit`. |
| `order_refunded`, `subscription_payment_refunded` | **new:** License `status: "cancelled"` (the refund policy promises this), Subscription cancelled. |

Idempotency: LS sends no event id. Dedupe on `sha256(event_name + data.id + data.attributes.updated_at)` in `WebhookEvent`
(rename `stripe_event_id` → `event_id`, add `provider`; keep a unique index).

## 4. Models
- `User`: add `provider_customer_id` (+ `payment_provider`); keep `stripe_customer_id` for legacy reads.
- `Subscription.provider`: enum `["stripe", "lemonsqueezy"]`.
- `Plan`: add `ls_variant_monthly` / `ls_variant_yearly`; `config/plans.ts` `priceIdFor()` and `planForPriceId()` pick the field by
  provider.
- `Coupon`: add `provider_coupon_code` (the LS discount code). `checkout.ts` passes it as `discount_code`.

## 5. Admin + web
- Admin → Products: LS variant id inputs next to the Stripe price ids (`adminProducts.ts`, `admin/products/[id]/page.tsx`).
- Admin → Coupons (`admin.ts` ~l.406): with LS, create the discount via `POST /discounts` (or accept a code already made in LS);
  drop the Stripe-only `free_trial/free_months` branch for LS.
- `dashboard/billing/page.tsx` copy: "Stripe's secure billing portal" → "Lemon Squeezy's customer portal"; `plan-checkout-button.tsx`
  comment.
- `CheckoutConsent` already says "Payments are processed by Lemon Squeezy".

## 6. Lemon Squeezy dashboard setup (manual)
1. Store → Products: one product per plugin, a **subscription variant** per plan × cycle (Pro monthly/yearly, Business, DT paid).
   Copy each variant id into Admin → Products.
2. Settings → Webhooks: URL `https://tlvapi.techlovev.in/api/webhooks/lemonsqueezy`, signing secret, subscribe the events in §3.
3. Settings → API: create a key. Env on the API server: `PAYMENT_PROVIDER=lemonsqueezy`, `LEMONSQUEEZY_API_KEY`,
   `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`. Add to `apps/api/.env.example`, README, DEPLOY-HOSTINGER.md.
4. Make sure the store is activated (identity verification + payout details), or checkouts stay in test mode.

## 7. Tests
- `__tests__/lemonSqueezyWebhook.test.ts`: signature reject, each event row above (mock `fetch` for `GET /subscriptions/:id`),
  dedupe, refund cancels the license.
- `checkout.test.ts`: with `PAYMENT_PROVIDER=lemonsqueezy`, asserts the `POST /checkouts` body (variant, custom data, discount code).
- Existing Stripe tests run with `PAYMENT_PROVIDER=stripe`, unchanged.

## 8. Rollout
1. Build + tests, deploy API (PM2) with `PAYMENT_PROVIDER=lemonsqueezy` and LS in **test mode**; buy Pro with a test card; confirm
   license email, plugin activation, cancel, refund → plugin drops to Free at next heartbeat.
2. Commit the legal pages + web copy in the same release (Vercel).
3. Switch the LS store to live.
