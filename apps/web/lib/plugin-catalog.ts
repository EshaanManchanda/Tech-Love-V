export interface PluginCatalogEntry {
  slug: string;
  name: string;
  tagline: string;
  startingPrice: string;
  href: string;
  accent: string; // tailwind border/gradient accent class
}

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
