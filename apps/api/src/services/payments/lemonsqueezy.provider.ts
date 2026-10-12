import { createHmac, timingSafeEqual } from "node:crypto";
import type { CreateCheckoutParams, PaymentProvider, ProviderSubscription } from "./PaymentProvider.js";

/**
 * Lemon Squeezy, called over its JSON:API REST API with plain fetch (no SDK).
 * LS is merchant of record: it is the seller, handles tax and invoices. Our own
 * database stays the license/plan source of truth — LS's built-in license-key
 * feature is deliberately not used (doc's "Important Design Decision").
 *
 * Env: LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET.
 */

const API = "https://api.lemonsqueezy.com/v1";

export type LsSubscriptionStatus = "on_trial" | "active" | "paused" | "past_due" | "unpaid" | "cancelled" | "expired";

/** The subscription attributes we read, from GET /subscriptions/:id or a subscription_* webhook. */
export interface LsSubscriptionAttributes {
  store_id: number;
  customer_id: number;
  order_id: number;
  variant_id: number;
  status: LsSubscriptionStatus;
  cancelled: boolean;
  renews_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export class LemonSqueezyError extends Error {}

export async function lsApi<T = { data: { id: string; attributes: Record<string, unknown> } }>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY ?? ""}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new LemonSqueezyError(`Lemon Squeezy ${method} ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (res.status === 204 ? {} : await res.json()) as T;
}

const storeRelationship = () => ({ store: { data: { type: "stores", id: String(process.env.LEMONSQUEEZY_STORE_ID ?? "") } } });

/** A cancelled subscription is paid up to ends_at; otherwise the period ends when it renews. */
export function lsPeriodEnd(attrs: Pick<LsSubscriptionAttributes, "cancelled" | "status" | "renews_at" | "ends_at">): Date | null {
  const raw = attrs.cancelled || attrs.status === "cancelled" || attrs.status === "expired" ? (attrs.ends_at ?? attrs.renews_at) : attrs.renews_at;
  return raw ? new Date(raw) : null;
}

function toProviderSubscription(id: string, attrs: LsSubscriptionAttributes): ProviderSubscription {
  return {
    id,
    status: attrs.status,
    priceId: String(attrs.variant_id),
    // LS doesn't expose the start of the current period; created_at is the closest it gives.
    currentPeriodStart: new Date(attrs.created_at),
    currentPeriodEnd: lsPeriodEnd(attrs) ?? new Date(attrs.updated_at),
    cancelAtPeriodEnd: attrs.cancelled,
  };
}

export async function getLsSubscription(subscriptionId: string): Promise<LsSubscriptionAttributes> {
  const { data } = await lsApi("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
  return data.attributes as unknown as LsSubscriptionAttributes;
}

export interface LsDiscountInput {
  code: string;
  amountType: "percent" | "fixed";
  amount: number; // percent, or cents for "fixed"
  duration: "once" | "repeating";
  durationInMonths?: number;
  maxRedemptions?: number;
  expiresAt?: Date;
}

/** Creates a discount code in the store; checkout applies it by code (checkout_data.discount_code). */
export async function createLsDiscount(input: LsDiscountInput): Promise<void> {
  await lsApi("POST", "/discounts", {
    data: {
      type: "discounts",
      attributes: {
        name: input.code,
        code: input.code,
        amount: input.amount,
        amount_type: input.amountType,
        duration: input.duration,
        ...(input.durationInMonths ? { duration_in_months: input.durationInMonths } : {}),
        ...(input.maxRedemptions ? { is_limited_redemptions: true, max_redemptions: input.maxRedemptions } : {}),
        ...(input.expiresAt ? { expires_at: input.expiresAt.toISOString() } : {}),
      },
      relationships: storeRelationship(),
    },
  });
}

async function changeVariant(subscriptionId: string, variantId: string, attributes: Record<string, unknown>): Promise<ProviderSubscription> {
  const { data } = await lsApi("PATCH", `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    data: { type: "subscriptions", id: subscriptionId, attributes: { variant_id: Number(variantId), ...attributes } },
  });
  return toProviderSubscription(data.id, data.attributes as unknown as LsSubscriptionAttributes);
}

export const lemonSqueezyProvider: PaymentProvider = {
  async createCheckout(params: CreateCheckoutParams) {
    const { data } = await lsApi("POST", "/checkouts", {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: params.email,
            ...(params.providerCouponId ? { discount_code: params.providerCouponId } : {}),
            // Comes back as meta.custom_data on every webhook for this subscription.
            custom: { user_id: params.userId, cycle: params.cycle, ...params.metadata },
          },
          product_options: { redirect_url: params.successUrl },
        },
        relationships: { ...storeRelationship(), variant: { data: { type: "variants", id: params.priceId } } },
      },
    });
    return { url: String(data.attributes.url) };
  },

  async createCustomer(email: string) {
    const { data } = await lsApi("POST", "/customers", {
      data: { type: "customers", attributes: { name: email, email }, relationships: storeRelationship() },
    });
    return { id: data.id };
  },

  // The portal URL is signed and short-lived, so it's fetched on every click, never stored.
  async createPortal(customerId: string) {
    const { data } = await lsApi("GET", `/customers/${encodeURIComponent(customerId)}`);
    const urls = data.attributes.urls as { customer_portal?: string } | undefined;
    if (!urls?.customer_portal) throw new LemonSqueezyError("Lemon Squeezy returned no customer portal URL.");
    return { url: urls.customer_portal };
  },

  async getSubscription(subscriptionId: string) {
    return toProviderSubscription(subscriptionId, await getLsSubscription(subscriptionId));
  },

  // LS always cancels at the end of the paid period (the customer keeps access until ends_at).
  async cancelSubscription(subscriptionId: string) {
    await lsApi("DELETE", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
  },

  async resumeSubscription(subscriptionId: string) {
    await lsApi("PATCH", `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      data: { type: "subscriptions", id: subscriptionId, attributes: { cancelled: false } },
    });
  },

  async upgradeSubscription(subscriptionId: string, newPriceId: string) {
    return changeVariant(subscriptionId, newPriceId, { invoice_immediately: true });
  },

  async downgradeSubscription(subscriptionId: string, newPriceId: string) {
    return changeVariant(subscriptionId, newPriceId, { disable_prorations: true });
  },

  /** X-Signature is the hex HMAC-SHA256 of the raw body, keyed with the webhook's signing secret. */
  verifyWebhook(rawBody: Buffer | string, signature: string) {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) throw new LemonSqueezyError("LEMONSQUEEZY_WEBHOOK_SECRET is not set.");
    const body = typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody;
    const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"));
    const given = Buffer.from(String(signature ?? ""));
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new LemonSqueezyError("Invalid signature.");
    }
    return JSON.parse(body.toString("utf8"));
  },
};
