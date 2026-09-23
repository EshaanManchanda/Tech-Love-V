import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ProductPrimaryCta } from "@/components/product-primary-cta";
import { API_URL } from "@/lib/api";
import { CONTACT_URL } from "@/lib/plans";

interface PublicPlan {
  _id: string;
  name: string;
  price_monthly: number | null;
  price_note?: string;
  cta_label: string;
  cta_type: "register" | "checkout" | "contact";
  highlighted?: boolean;
}

interface PublicProduct {
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  current_version: string | null;
  plans: PublicPlan[];
}

// This route only renders for a product with no dedicated static page (e.g.
// app/(public)/plugins/certificate-generator/page.tsx) — Next.js matches a
// literal segment before a dynamic one, so those two keep their existing,
// richer hand-authored pages untouched.
async function getProduct(slug: string): Promise<PublicProduct | null> {
  try {
    const res = await fetch(`${API_URL}/api/products/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // API unreachable (e.g. during a build with no API running) — treat as not found rather than crashing the page
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};
  return { title: `${product.name} — Tech Love V`, description: product.tagline ?? product.description };
}

// A real Stripe "checkout" CTA needs a stripe_price_id wired up per plan
// (see scripts/create-stripe-prices.ts) — out of scope for a freshly-created
// product, so it falls back to registration same as a free plan for now.
function planHref(plan: PublicPlan) {
  if (plan.cta_type === "contact") return CONTACT_URL;
  return "/register";
}

export default async function DynamicProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) return notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-slate-900">{product.name}</h1>
        {product.tagline && <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">{product.tagline}</p>}
        {product.current_version && <p className="mt-2 text-sm text-slate-400">Current version {product.current_version}</p>}
        <div className="mt-8">
          <ProductPrimaryCta
            productSlug={product.slug}
            registerLabel="Get started"
            className="inline-block rounded-md bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-brand-200 hover:bg-brand-700"
          />
        </div>
      </div>

      {product.description && <p className="mx-auto mt-12 max-w-2xl text-center text-slate-600">{product.description}</p>}

      {product.plans.length > 0 && (
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {product.plans.map((plan) => (
            <Card key={plan._id} className={plan.highlighted ? "border-brand-500 ring-1 ring-brand-500" : undefined}>
              <CardContent className="pt-6 text-center">
                <h2 className="font-display text-lg font-semibold text-slate-900">{plan.name}</h2>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {plan.price_monthly != null ? `$${plan.price_monthly}/mo` : (plan.price_note ?? "Contact us")}
                </p>
                <a
                  href={planHref(plan)}
                  className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  {plan.cta_label}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
