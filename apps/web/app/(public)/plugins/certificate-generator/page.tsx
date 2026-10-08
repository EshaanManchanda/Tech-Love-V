import type { Metadata } from "next";
import { ProductLanding, type ProductContent } from "@/components/product-landing";
import { JsonLd } from "@/components/json-ld";
import { API_URL } from "@/lib/api";
import { CG_FEATURE_LINKS } from "@/lib/cg-features";
import { CG_ENTITY_SENTENCE, CG_OG_IMAGE, CG_TUTORIAL, SITE_URL, YOUTUBE_PLAYLIST, breadcrumbLd } from "@/lib/site";
import content from "../../../../../../marketing-site/content.json";

const TITLE = "Certificate Generator — Certificate Management System for WordPress";
// Factual, keyword-bearing summary (what it is + what it does) rather than the hero tagline —
// this is the snippet search results and AI answers most often show.
const DESCRIPTION =
  "WordPress certificate plugin: design templates, bulk-issue PDF certificates from CSV or your LMS, and verify them by QR code and serial number. Free plan.";

export const metadata: Metadata = {
  alternates: { canonical: "/plugins/certificate-generator" },
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { images: [CG_OG_IMAGE], title: TITLE, description: DESCRIPTION, url: "/plugins/certificate-generator" },
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
    // Prices with a published number only — Business is contact-for-pricing, so it's left out.
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      { "@type": "Offer", name: "Pro (monthly)", price: "3.5", priceCurrency: "USD", url: `${SITE_URL}/certificate-generator/pricing` },
      { "@type": "Offer", name: "Pro (yearly)", price: "35", priceCurrency: "USD", url: `${SITE_URL}/certificate-generator/pricing` },
    ],
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
        video={CG_TUTORIAL}
        docsHref="/docs/certificate-generator/getting-started"
      />
    </>
  );
}
