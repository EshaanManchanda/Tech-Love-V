import type { Metadata } from "next";

// page.tsx is a client component and can't export metadata itself.
export const metadata: Metadata = {
  title: "Dynamic Tags Pricing — Free & Paid",
  description: "Dynamic Tags for WordPress: Free plan with up to 15 dynamic tags, Paid at $2/month ($19/year) for WooCommerce, ACF arrays, loops, and query/API data sources.",
  alternates: { canonical: "/dynamic-tags/pricing" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
