export type PlanSlug = "pro" | "business" | "paid";

export const PLANS: Record<PlanSlug, { label: string; activation_limit: number }> = {
  pro: { label: "Pro", activation_limit: 1 },
  business: { label: "Business", activation_limit: 5 },
  paid: { label: "Paid", activation_limit: 1 },
};

export function activationLimitFor(plan: PlanSlug): number {
  return PLANS[plan].activation_limit;
}

// Plan slugs are unique across the whole platform (no two products ever
// share one), so the product a license belongs to is fully determined by
// its plan — no separate parameter needs to be threaded everywhere.
export type ProductSlug = "certificate-generator" | "dynamic-tags";

const PRODUCT_FOR_PLAN: Record<PlanSlug, ProductSlug> = {
  pro: "certificate-generator",
  business: "certificate-generator",
  paid: "dynamic-tags",
};

export function productForPlan(plan: PlanSlug): ProductSlug {
  return PRODUCT_FOR_PLAN[plan];
}
