import type { Metadata } from "next";

// page.tsx is a client component and can't export metadata itself.
export const metadata: Metadata = {
  title: "Certificate Generator Pricing — Free, Pro & Business",
  description:
    "Certificate Generator for WordPress: the free plugin is unlimited — certificates, emails and CSV imports, no account needed. Pro add-on at ₹249/month (₹2,499/year) adds LMS & WooCommerce auto-issue, REST API and custom fonts. Business for up to 5 sites.",
  alternates: { canonical: "/certificate-generator/pricing" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
