import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PLUGIN_CATALOG } from "@/lib/plugin-catalog";
import cgContent from "../../../../marketing-site/content.json";
import dtContent from "../../../../marketing-site/content.dynamic-tags.json";

export const metadata: Metadata = {
  title: "Tech Love V",
  description: "Tech Love V by Eshaan Manchanda — WordPress plugins with a real license management system behind them.",
};

const trustBullets = [
  { title: "One dashboard for every plugin", detail: "Manage licenses, billing, and downloads for everything you've bought from Tech Love V in one place." },
  { title: "Real usage-based free tiers", detail: "Every plugin ships a Free plan that's genuinely usable — not a crippled trial designed to expire." },
  { title: "Transparent pricing, always", detail: "Every price is public on the page. No quote-only walls, no surprise per-feature add-on fees." },
];

const timeSaved = [
  { name: cgContent.product_name, href: "/plugins/certificate-generator", ...cgContent.time_saved },
  { name: dtContent.product_name, href: "/plugins/dynamic-tags", ...dtContent.time_saved },
];

const useCases = [
  {
    audience: "Course creators & schools",
    detail: "Certificate Generator auto-issues certificates and badges the moment a course finishes — no manual PDF work, no chasing students for their design.",
    href: "/plugins/certificate-generator",
  },
  {
    audience: "WooCommerce store owners",
    detail: "Dynamic Tags drops live price, stock, and SKU fields straight into any page or email template — no theme edit for every product change.",
    href: "/plugins/dynamic-tags",
  },
  {
    audience: "Agencies & freelancers",
    detail: "Bulk import, bulk send, and REST APIs on both plugins mean client sites scale past a handful of records without extra billable hours.",
    href: "/plugins",
  },
  {
    audience: "Page builder users (Elementor, Gutenberg, Divi)",
    detail: "Every placeholder and merge tag works in the builder you already use — no separate widget pack, no builder lock-in.",
    href: "/plugins/dynamic-tags",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Tech Love V</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            WordPress plugins built by Eshaan Manchanda, with a real license management system behind them — buy once, activate anywhere, keep working after checkout.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/plugins" className="rounded-md bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-brand-200 hover:bg-brand-700">
              Browse all plugins
            </Link>
            <Link href="/docs" className="rounded-md bg-white px-6 py-3 text-sm font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100">
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* Featured plugins */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="text-center font-display text-2xl font-bold text-slate-900">Our plugins</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {PLUGIN_CATALOG.map((plugin) => (
            <Link key={plugin.slug} href={plugin.href}>
              <Card className={`h-full overflow-hidden border-t-4 ${plugin.accent} transition-shadow hover:shadow-lg`}>
                <CardContent className="pt-6">
                  <h3 className="font-display text-lg font-semibold text-slate-900">{plugin.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{plugin.tagline}</p>
                  <p className="mt-4 text-sm font-medium text-brand-700">{plugin.startingPrice}</p>
                  <span className="mt-4 inline-block text-sm font-medium text-brand-600">Learn more →</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          <Link href="/plugins" className="font-medium text-brand-600 underline">
            See the full catalog
          </Link>
        </p>
      </section>

      {/* Time saved */}
      <section className="border-y border-slate-200 bg-brand-600">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center font-display text-2xl font-bold text-white">Time back in your week, not more busywork</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {timeSaved.map((t) => (
              <Link key={t.name} href={t.href} className="block rounded-lg bg-white/10 p-6 ring-1 ring-white/20 transition-colors hover:bg-white/15">
                <p className="font-display text-3xl font-extrabold text-white">{t.stat}</p>
                <p className="mt-1 text-sm font-medium text-brand-100">{t.label}</p>
                <p className="mt-3 text-sm text-brand-100/90">{t.detail}</p>
                <p className="mt-3 text-sm font-semibold text-white">{t.name} →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Built for how you work */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="text-center font-display text-2xl font-bold text-slate-900">Built for how you actually work</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">Real jobs our plugins were built to shorten — not hypothetical use cases.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {useCases.map((u) => (
            <Link key={u.audience} href={u.href} className="block rounded-lg bg-white p-5 ring-1 ring-slate-200 transition-shadow hover:shadow-md">
              <h3 className="font-semibold text-slate-900">{u.audience}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{u.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Tech Love V */}
      <section className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-2xl font-bold text-slate-900">Why Tech Love V</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {trustBullets.map((b, i) => (
              <div key={b.title} className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{i + 1}</span>
                <h3 className="mt-3 font-semibold text-slate-900">{b.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{b.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-600 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-white">Find the plugin that fits your site</h2>
          <p className="mt-2 text-brand-100">Free forever tiers, no card required to start.</p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/plugins" className="inline-block rounded-md bg-white px-6 py-3 text-sm font-medium text-brand-700 hover:bg-brand-50">
              Browse all plugins
            </Link>
            <Link href="/register" className="inline-block rounded-md bg-brand-700/40 px-6 py-3 text-sm font-medium text-white ring-1 ring-white/40 hover:bg-brand-700/60">
              Create an account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
