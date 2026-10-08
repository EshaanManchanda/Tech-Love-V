import type { Metadata } from "next";
import { ProductLanding, type ProductContent } from "@/components/product-landing";
import { JsonLd } from "@/components/json-ld";
import { API_URL } from "@/lib/api";
import { DT_ENTITY_SENTENCE, SITE_URL, breadcrumbLd } from "@/lib/site";
import content from "../../../../../../marketing-site/content.dynamic-tags.json";

const TITLE = "Dynamic Tags — Merge Tags for WooCommerce, ACF & Any Page Builder";

export const metadata: Metadata = {
  alternates: { canonical: "/plugins/dynamic-tags" },
  title: TITLE,
  description: content.hero.subheadline,
  openGraph: { title: TITLE, description: content.hero.subheadline, url: "/plugins/dynamic-tags" },
};

async function getCurrentVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/products/dynamic-tags`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const product = await res.json();
    return product.current_version ?? null;
  } catch {
    return null; // API unreachable (e.g. during a build with no API running) — page still renders fine without the version badge
  }
}

export default async function DynamicTagsPage() {
  const currentVersion = await getCurrentVersion();
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Dynamic Tags",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "WordPress",
    ...(currentVersion && { softwareVersion: currentVersion }),
    description: DT_ENTITY_SENTENCE,
    url: `${SITE_URL}/plugins/dynamic-tags`,
    publisher: { "@id": `${SITE_URL}/#organization` },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free plan; Paid from $2/month" },
  };
  return (
    <>
      <JsonLd data={softwareLd} />
      <JsonLd data={breadcrumbLd([{ name: "Plugins", path: "/plugins" }, { name: "Dynamic Tags", path: "/plugins/dynamic-tags" }])} />
      <ProductLanding
        content={content as ProductContent}
        pricingHref="/dynamic-tags/pricing"
        productSlug="dynamic-tags"
        currentVersion={currentVersion}
        entitySentence={DT_ENTITY_SENTENCE}
      />
    </>
  );
}
