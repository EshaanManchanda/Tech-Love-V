import { API_URL } from "@/lib/api";

export interface PluginCatalogEntry {
  slug: string;
  name: string;
  tagline: string;
  startingPrice: string;
  href: string;
  accent: string; // tailwind border/gradient accent class
}

// Presentation extras for the hand-curated plugins (accent colour, price line,
// fallback copy). Which products exist — and their name/tagline — comes from
// the DB via getCatalog(); this list is only used on its own if the API is down.
export const PLUGIN_CATALOG: PluginCatalogEntry[] = [
  {
    slug: "certificate-generator",
    name: "Certificate Generator",
    tagline: "Design once, auto-issue certificates and badges from your LMS or store, verify with a QR code.",
    startingPrice: "Free, Pro from $3.5/mo",
    href: "/plugins/certificate-generator",
    accent: "border-t-indigo-600",
  },
  {
    slug: "dynamic-tags",
    name: "Dynamic Tags",
    tagline: "One merge-tag syntax for WooCommerce, ACF, queries, and external APIs — in any page builder.",
    startingPrice: "Free, Paid from $2/mo",
    href: "/plugins/dynamic-tags",
    accent: "border-t-rose-500",
  },
];

// Active products from the admin Products CMS, refreshed every 60s: adding,
// archiving, renaming or retagging a product there shows up without a deploy.
export async function getCatalog(): Promise<PluginCatalogEntry[]> {
  try {
    const res = await fetch(`${API_URL}/api/products`, { next: { revalidate: 60 } });
    if (!res.ok) return PLUGIN_CATALOG;
    const products: { slug: string; name: string; tagline?: string }[] = await res.json();
    return products.map((p) => {
      const curated = PLUGIN_CATALOG.find((c) => c.slug === p.slug);
      return {
        slug: p.slug,
        name: p.name,
        tagline: p.tagline || curated?.tagline || "",
        startingPrice: curated?.startingPrice ?? "",
        href: `/plugins/${p.slug}`,
        accent: curated?.accent ?? "border-t-slate-400",
      };
    });
  } catch {
    return PLUGIN_CATALOG; // API unreachable (e.g. during a build) — show the curated list rather than nothing
  }
}
