# Stripe → Lemon Squeezy migration

**Status:** built on `feat/lemonsqueezy` (2026-10-12). Setup steps: `DEPLOY-HOSTINGER.md` §8.

**Why:** the seller is an individual in India selling worldwide. Lemon Squeezy (LS) is merchant of record: it is the legal seller,
collects and remits VAT / sales tax / GST, and issues invoices. The legal pages (`/terms`, `/privacy`, `/refund-policy`) say so and
ship in the same release.

**Decisions:** pre-launch, no live Stripe subscribers · Stripe kept behind `PAYMENT_PROVIDER` for rollback · hosted checkout via
redirect · our coupons map to LS discount codes · buyers pick USD or INR, both charged in USD (LS has one store currency); INR uses
separately priced "India" variants (Pro ≈ ₹249/month, ₹2,999/year).

Our DB stays the source of truth for licenses; LS's own license-key feature isn't used. Licenses, activations, the plugin endpoints
and the plugin don't change.

## What's where

| Piece | File |
|---|---|
| Provider choice (`PAYMENT_PROVIDER`, default `stripe`) | `apps/api/src/services/payments/index.ts` |
| LS REST client: checkout, portal, cancel/resume/plan change, discounts, signature check | `services/payments/lemonsqueezy.provider.ts` |
| Webhook (`/api/webhooks/lemonsqueezy`) | `routes/lemonSqueezyWebhook.ts` |
| License bookkeeping shared by both webhooks | `services/billingService.ts` |
| Variant lookup by cycle × currency | `config/plans.ts` `priceIdFor()` / `planForPriceId()` |
| Pricing-page currency toggle, geo default | `apps/web/lib/currency.ts`, `components/currency-toggle.tsx`, `app/api/geo/route.ts` |

## Data

- `Plan`: `ls_variant_{monthly,yearly}_{usd,inr}`, `price_{monthly,yearly}_inr` (display only).
- `Subscription.provider`: `"stripe" | "lemonsqueezy"`; `provider_order_id` (LS order, used for `order_refunded`).
- `User.lemonsqueezy_customer_id` (next to `stripe_customer_id`); the billing portal prefers the active provider's account.
- `Coupon.ls_discount_code`; `stripe_coupon_id` is now optional.
- `WebhookEvent.stripe_event_id` holds every provider's event id (LS ids are `ls_<sha256>` of event name + object id +
  `updated_at`, since LS sends no event id). Not renamed, so the existing unique index keeps working.

## Webhook events

| LS event | Effect |
|---|---|
| `subscription_created` | Subscription + License (expires at `renews_at`), key emailed, coupon redemption, customer id stored. User from `custom_data.user_id`, else the buyer's email. |
| `subscription_updated` / `_cancelled` / `_resumed` / `_expired` / `_paused` / `_unpaused` | Status synced; license runs to `renews_at` (or `ends_at` once cancelled); variant change → plan + seat limit change. |
| `subscription_payment_success` / `_recovered` | Fetch the subscription, sync as above (renewal). |
| `subscription_payment_failed` | Subscription `past_due`; license keeps its date (plugin's 3-day grace covers a quick retry). |
| `subscription_payment_refunded`, `order_refunded` (full refunds only) | License and Subscription `cancelled`; LS subscription cancelled so it doesn't renew. Later updates don't revive it. |

A handler error un-records the event so LS's retry is processed.

## Before going live

1. LS dashboard setup (`DEPLOY-HOSTINGER.md` §8), `PAYMENT_PROVIDER=lemonsqueezy` + `LEMONSQUEEZY_*` in `apps/api/.env`, `pm2 restart api`.
2. Re-run `seed-plans.ts` so Pro has its INR display prices.
3. Test mode end to end: buy Pro (USD and INR) with a test card → license email → activate in the plugin → cancel → refund →
   the site drops to Free at the next heartbeat.
4. Deploy web (Vercel) with the legal pages, then switch the store to live.
