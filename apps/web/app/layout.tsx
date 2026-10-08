import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import { JsonLd } from "@/components/json-ld";
import { ORGANIZATION_LD, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Tech Love V", template: "%s | Tech Love V" },
  description: "Tech Love V by Eshaan Manchanda — licensing and billing for WordPress plugins.",
  openGraph: { siteName: "Tech Love V", type: "website", images: ["/marketing/hero-dashboard.png"] },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-screen font-sans">
        <JsonLd data={ORGANIZATION_LD} />
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
