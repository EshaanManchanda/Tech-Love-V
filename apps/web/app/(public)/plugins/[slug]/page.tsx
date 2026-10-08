import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/json-ld";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { ProductPrimaryCta } from "@/components/product-primary-cta";
import { API_URL } from "@/lib/api";
import { CONTACT_URL } from "@/lib/plans";
import { OG_IMAGE, SITE_URL, breadcrumbLd } from "@/lib/site";

interface PublicPlan {
  _id: string;
  slug: string;
  name: string;
  billing_type: "free" | "recurring" | "contact";
  price_monthly: number | null;
  price_yearly: number | null;
  price_note?: string;
  activation_limit?: number;
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

// This route renders every product without a dedicated static page (e.g.
// app/(public)/plugins/certificate-generator/page.tsx) — Next.js matches a
// literal segment before a dynamic one. Everything here, including the SEO
// metadata and structured data, comes from the admin Products CMS, so a new
// product is search- and AI-ready the moment it's published.
async function getProduct(slug: string): Promise<PublicProduct | null> {
  try {
    const res = await fetch(`${API_URL}/api/products/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // API unreachable (e.g. during a build with no API running) — treat as not found rather than crashing the page
  }
}

// One plain sentence that says what the product is — the part search engines
// and AI answers quote. Built from the CMS fields so it never drifts from them.
function definition(product: PublicProduct): string {
  const lead = `${product.name} is a WordPress plugin by Tech Love V.`;
  return product.tagline ? `${lead} ${product.tagline.replace(/\.?$/, ".")}` : lead;
}

function metaDescription(product: PublicProduct): string {
  const text = [definition(product), product.description].filter(Boolean).join(" ");
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

function priceLabel(plan: PublicPlan): string {
  if (plan.billing_type === "free") return "$0";
  if (plan.price_monthly != null) return `$${plan.price_monthly}/mo`;
  return plan.price_note ?? "Contact us";
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};
  const title = `${product.name} — WordPress Plugin`;
  const description = metaDescription(product);
  const path = `/plugins/${params.slug}`;
  return { title, description, alternates: { canonical: path }, openGraph: { images: [OG_IMAGE], title, description, url: path } };
}

export default async function DynamicProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) return notFound();
  const path = `/plugins/${product.slug}`;

  const pricedPlans = product.plans.filter((p) => p.billing_type === "free" || p.price_monthly != null);
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "WordPress",
    ...(product.current_version && { softwareVersion: product.current_version }),
    description: [definition(product), product.description].filter(Boolean).join(" "),
    url: `${SITE_URL}${path}`,
    publisher: { "@id": `${SITE_URL}/#organization` },
    // Only plans with a real, published price — never invented numbers.
    ...(pricedPlans.length > 0 && {
      offers: pricedPlans.map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: String(p.billing_type === "free" ? 0 : p.price_monthly),
        priceCurrency: "USD",
        url: `${SITE_URL}${path}`,
      })),
    }),
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <JsonLd data={softwareLd} />
      <JsonLd data={breadcrumbLd([{ name: "Plugins", path: "/plugins" }, { name: product.name, path }])} />

      <nav className="text-sm text-slate-500">
        <Link href="/plugins" className="hover:text-slate-900">Plugins</Link> / {product.name}
      </nav>

      <div className="mt-6 text-center">
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

      <section className="mx-auto mt-14 max-w-2xl">
        <h2 className="font-display text-2xl font-bold text-slate-900">What is {product.name}?</h2>
        <p className="mt-3 text-slate-700">{definition(product)}</p>
        {product.description && <p className="mt-3 whitespace-pre-line text-slate-600">{product.description}</p>}
      </section>

      {product.plans.length > 0 && (
        <section className="mt-16">
          <h2 className="text-center font-display text-2xl font-bold text-slate-900">{product.name} pricing</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {product.plans.map((plan) => {
              const buttonClass = "mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60";
              return (
                <Card key={plan._id} className={plan.highlighted ? "border-brand-500 ring-1 ring-brand-500" : undefined}>
                  <CardContent className="pt-6 text-center">
                    <h3 className="font-display text-lg font-semibold text-slate-900">{plan.name}</h3>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{priceLabel(plan)}</p>
                    {plan.price_yearly != null && plan.billing_type === "recurring" && (
                      <p className="text-sm text-slate-500">or ${plan.price_yearly}/year</p>
                    )}
                    {plan.billing_type !== "free" && plan.activation_limit ? (
                      <p className="mt-2 text-sm text-slate-600">
                        {plan.activation_limit} {plan.activation_limit === 1 ? "site" : "sites"} per license
                      </p>
                    ) : null}
                    {plan.cta_type === "checkout" ? (
                      <PlanCheckoutButton product={product.slug} plan={plan.slug} label={plan.cta_label} className={buttonClass} />
                    ) : plan.cta_type === "contact" ? (
                      <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" className={buttonClass}>
                        {plan.cta_label}
                      </a>
                    ) : (
                      <Link href="/register" className={buttonClass}>
                        {plan.cta_label}
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
