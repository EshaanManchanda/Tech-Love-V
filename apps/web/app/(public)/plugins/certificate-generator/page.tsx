import type { Metadata } from "next";
import { ProductLanding, type ProductContent } from "@/components/product-landing";
import content from "../../../../../../marketing-site/content.json";

export const metadata: Metadata = {
  title: `${content.product_name} — Tech Love V`,
  description: content.hero.subheadline,
};

export default function CertificateGeneratorPage() {
  return <ProductLanding content={content as ProductContent} pricingHref="/pricing" />;
}
