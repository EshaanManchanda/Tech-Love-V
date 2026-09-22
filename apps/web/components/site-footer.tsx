import Link from "next/link";
import { CONTACT_URL } from "@/lib/plans";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="h-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div>
          <p className="font-display text-sm font-bold text-brand-700">Tech Love V</p>
          <p className="mt-1 text-sm text-slate-500">By Eshaan Manchanda — licensing &amp; billing for WordPress plugins.</p>
        </div>

        <div className="flex gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-slate-900">Product</span>
            <Link href="/" className="text-slate-500 hover:text-slate-900">Home</Link>
            <Link href="/plugins" className="text-slate-500 hover:text-slate-900">Plugins</Link>
            <Link href="/docs" className="text-slate-500 hover:text-slate-900">Documentation</Link>
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
