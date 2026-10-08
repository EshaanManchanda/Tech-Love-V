import type { Metadata } from "next";

// page.tsx is a client component and can't export metadata itself.
export const metadata: Metadata = {
  title: "Certificate Generator Pricing — Free, Pro & Business",
  description:
    "Certificate Generator for WordPress: Free plan with 250 certificates/month, Pro at $3.5/month ($35/year) with unlimited bulk import and REST API, Business for unlimited certificates and multisite.",
  alternates: { canonical: "/certificate-generator/pricing" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
