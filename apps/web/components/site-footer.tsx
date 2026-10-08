import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { CONTACT_URL } from "@/lib/plans";
import { FACEBOOK_URL, INSTAGRAM_URL, YOUTUBE_CHANNEL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="h-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div>
          <p className="font-display text-sm font-bold text-brand-700">Tech Love V</p>
          <p className="mt-1 text-sm text-slate-500">By Eshaan Manchanda — licensing &amp; billing for WordPress plugins.</p>
          <div className="mt-4 flex gap-3 text-slate-400">
            <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-slate-900"><Youtube className="h-5 w-5" /></a>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-slate-900"><Facebook className="h-5 w-5" /></a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-slate-900"><Instagram className="h-5 w-5" /></a>
          </div>
        </div>

        <div className="flex flex-wrap gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-slate-900">Product</span>
            <Link href="/" className="text-slate-500 hover:text-slate-900">Home</Link>
            <Link href="/plugins" className="text-slate-500 hover:text-slate-900">Plugins</Link>
            <Link href="/docs" className="text-slate-500 hover:text-slate-900">Documentation</Link>
            <Link href="/blog" className="text-slate-500 hover:text-slate-900">Blog</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-slate-900">Certificate Generator</span>
            <Link href="/certificate-generator/certificate-management-system" className="text-slate-500 hover:text-slate-900">Features</Link>
            <Link href="/certificate-generator/product-facts" className="text-slate-500 hover:text-slate-900">Product facts</Link>
            <Link href="/certificate-generator/compare" className="text-slate-500 hover:text-slate-900">Compare</Link>
            <Link href="/certificate-generator/pricing" className="text-slate-500 hover:text-slate-900">Pricing</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-slate-900">Contact</span>
            <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900">
              Contact us
            </a>
          </div>
        </div>
      </div>

      <p className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Tech Love V, by Eshaan Manchanda. All rights reserved.
      </p>
    </footer>
  );
}
