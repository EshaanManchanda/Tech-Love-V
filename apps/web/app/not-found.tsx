import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="font-display text-5xl font-bold text-brand-600">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-2 text-slate-600">The page you were looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex gap-4">
          <Link href="/plugins" className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Browse plugins</Link>
          <Link href="/docs" className="rounded-md px-5 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100">Documentation</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
