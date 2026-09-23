import type { Metadata } from "next";
import { ProductLanding, type ProductContent } from "@/components/product-landing";
import { API_URL } from "@/lib/api";
import content from "../../../../../../marketing-site/content.dynamic-tags.json";

export const metadata: Metadata = {
  title: `${content.product_name} — Tech Love V`,
  description: content.hero.subheadline,
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
  return <ProductLanding content={content as ProductContent} pricingHref="/dynamic-tags/pricing" productSlug="dynamic-tags" currentVersion={currentVersion} />;
}
