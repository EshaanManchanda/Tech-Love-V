import type { Metadata } from "next";
import { ProductLanding, type ProductContent } from "@/components/product-landing";
import { JsonLd } from "@/components/json-ld";
import { API_URL } from "@/lib/api";
import { CG_FEATURE_LINKS } from "@/lib/cg-features";
import { CG_ENTITY_SENTENCE, SITE_URL, YOUTUBE_PLAYLIST, breadcrumbLd } from "@/lib/site";
import content from "../../../../../../marketing-site/content.json";

export const metadata: Metadata = {
  alternates: { canonical: "/plugins/certificate-generator" },
  title: "Certificate Generator — Certificate Management System for WordPress",
  description: content.hero.subheadline,
  openGraph: { title: "Certificate Generator — Certificate Management System for WordPress", description: content.hero.subheadline, url: "/plugins/certificate-generator" },
};

async function getCurrentVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/products/certificate-generator`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const product = await res.json();
    return product.current_version ?? null;
  } catch {
    return null; // API unreachable (e.g. during a build with no API running) — page still renders fine without the version badge
  }
}

export default async function CertificateGeneratorPage() {
  const currentVersion = await getCurrentVersion();
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Certificate Generator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Certificate management system",
    operatingSystem: "WordPress 6.0+",
    ...(currentVersion && { softwareVersion: currentVersion }),
    description: CG_ENTITY_SENTENCE,
    url: `${SITE_URL}/plugins/certificate-generator`,
    image: `${SITE_URL}/marketing/hero-dashboard.png`,
    publisher: { "@id": `${SITE_URL}/#organization` },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free plan; Pro from $3.5/month" },
  };
  return (
    <>
      <JsonLd data={softwareLd} />
      <JsonLd data={breadcrumbLd([{ name: "Plugins", path: "/plugins" }, { name: "Certificate Generator", path: "/plugins/certificate-generator" }])} />
      <ProductLanding
        content={content as ProductContent}
        pricingHref="/certificate-generator/pricing"
        productSlug="certificate-generator"
        currentVersion={currentVersion}
        entitySentence={CG_ENTITY_SENTENCE}
        featureLinks={CG_FEATURE_LINKS}
        tutorialHref={YOUTUBE_PLAYLIST}
        docsHref="/docs/certificate-generator/getting-started"
      />
    </>
  );
}
