import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { Coupon } from "../models/Coupon.js";
import { User } from "../models/User.js";
import { defaultProductForPlan, priceIdFor, resolveLicensePlan } from "../config/plans.js";
import { stripeProvider } from "../services/payments/stripe.provider.js";

export const checkoutRouter = Router();

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

// The two original products have dedicated pricing pages; any other product's
// plans are shown on its generic /plugins/<slug> page.
const DEDICATED_PRICING = new Set(["certificate-generator", "dynamic-tags"]);
const pricingPath = (product: string) => (DEDICATED_PRICING.has(product) ? `/${product}/pricing` : `/plugins/${product}`);

checkoutRouter.post("/session", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      product: z.string().min(1).optional(), // omitted by older clients — inferred from the plan slug
      plan: z.string().min(1),
      billing_cycle: z.enum(["monthly", "yearly"]),
      coupon_code: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "plan and billing_cycle are required" } });

  const productSlug = parsed.data.product ?? defaultProductForPlan(parsed.data.plan);
  const licensePlan = await resolveLicensePlan(productSlug, parsed.data.plan);
  if (!licensePlan) return res.status(400).json({ error: { code: "INVALID_INPUT", message: "That plan isn't available for checkout." } });
  let priceId: string;
  try {
    priceId = priceIdFor(licensePlan, parsed.data.billing_cycle);
  } catch {
    return res.status(400).json({ error: { code: "PLAN_NOT_PURCHASABLE", message: `No ${parsed.data.billing_cycle} price is set up for this plan yet.` } });
  }

  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found." } });

  let providerCouponId: string | undefined;
  let couponId: string | undefined;
  if (parsed.data.coupon_code) {
    const coupon = await Coupon.findOne({ code: parsed.data.coupon_code.toUpperCase(), status: "active" });
    if (!coupon) return res.status(400).json({ error: { code: "INVALID_COUPON", message: "Coupon not found or inactive." } });
    if (coupon.expires_at && coupon.expires_at < new Date()) {
      return res.status(400).json({ error: { code: "COUPON_EXPIRED", message: "Coupon has expired." } });
    }
    if (coupon.max_redemptions !== undefined && coupon.redemption_count >= coupon.max_redemptions) {
      return res.status(400).json({ error: { code: "COUPON_EXHAUSTED", message: "Coupon has reached its redemption limit." } });
    }
    if (!coupon.applicable_plans.includes(parsed.data.plan)) {
      return res.status(400).json({ error: { code: "COUPON_NOT_APPLICABLE", message: "Coupon does not apply to this plan." } });
    }
    providerCouponId = coupon.stripe_coupon_id;
    couponId = coupon._id.toString();
  }

  const { url } = await stripeProvider.createCheckout({
    userId: user._id.toString(),
    email: user.email,
    stripeCustomerId: user.stripe_customer_id,
    priceId,
    cycle: parsed.data.billing_cycle,
    providerCouponId,
    // The webhook reads product/plan from here first — a price id alone can't
    // tell two products apart if they ever share one.
    metadata: { product: productSlug, plan: parsed.data.plan, ...(couponId ? { coupon_id: couponId } : {}) },
    successUrl: `${appUrl()}/dashboard?checkout=success`,
    cancelUrl: `${appUrl()}${pricingPath(productSlug)}?checkout=cancelled`,
  });

  res.json({ url });
});

const billingRouter = Router();

billingRouter.post("/portal", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.id);
  if (!user?.stripe_customer_id) {
    return res.status(400).json({ error: { code: "NO_BILLING_ACCOUNT", message: "No billing account yet — subscribe first." } });
  }

  const { url } = await stripeProvider.createPortal(user.stripe_customer_id, `${appUrl()}/dashboard`);
  res.json({ url });
});

export { billingRouter };
