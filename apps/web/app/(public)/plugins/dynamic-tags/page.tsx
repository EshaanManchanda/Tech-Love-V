import type { Metadata } from "next";
import { ProductLanding, type ProductContent } from "@/components/product-landing";
import content from "../../../../../../marketing-site/content.dynamic-tags.json";

export const metadata: Metadata = {
  title: `${content.product_name} — Tech Love V`,
  description: content.hero.subheadline,
};

export default function DynamicTagsPage() {
  return <ProductLanding content={content as ProductContent} pricingHref="/dynamic-tags/pricing" />;
}
