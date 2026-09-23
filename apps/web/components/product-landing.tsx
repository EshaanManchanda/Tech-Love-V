import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CONTACT_URL } from "@/lib/plans";
import { ProductPrimaryCta } from "@/components/product-primary-cta";

export interface ProductContent {
  product_name: string;
  time_saved: { stat: string; label: string; detail: string };
  how_it_works?: { headline: string; steps: { title: string; detail: string; screenshot_ref: string }[] };
  hero: { headline: string; subheadline: string; primary_cta: string; secondary_cta: string; screenshot_ref: string };
  features: { id: string; title: string; pitch: string; detail: string; screenshot_ref: string }[];
  why_choose_us: { title: string; detail: string }[];
  comparison: { note: string; columns: string[]; rows: string[][] };
  plans_summary: {
    name: string;
    price: string;
    highlight: string;
    cta_label: string;
    cta_type: "register" | "checkout" | "contact";
    highlighted?: boolean;
  }[];
}

// New screenshots are served from apps/web/public/marketing/<file> — drop the file
// there (matching a feature's screenshot_ref) and it replaces the placeholder
// automatically, no code change needed.
function hasScreenshot(file: string) {
  return fs.existsSync(path.join(process.cwd(), "public/marketing", file));
}

function Screenshot({ file, alt }: { file: string; alt: string }) {
  const exists = hasScreenshot(file);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      </div>
      <div className="relative aspect-[16/10] w-full bg-slate-50">
        {exists ? (
          <Image src={`/marketing/${file}`} alt={alt} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover object-top" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 text-slate-400">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="M21 15l-5-5-4 4-2-2-5 5" />
            </svg>
            <span className="text-xs font-medium">Preview coming soon</span>
          </div>
        )}
      </div>
    </div>
  );
}

function planHref(plan: ProductContent["plans_summary"][number], pricingHref: string) {
  if (plan.cta_type === "register") return "/register";
  if (plan.cta_type === "contact") return CONTACT_URL;
  return pricingHref;
}

export function ProductLanding({
  content,
  pricingHref,
  productSlug,
  currentVersion,
}: {
  content: ProductContent;
  pricingHref: string;
  productSlug: string;
  currentVersion?: string | null;
}) {
  return (
    <>
      {/* 1. Hero */}
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:grid-cols-2 sm:py-28">
          <div className="text-center sm:text-left">
            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{content.hero.headline}</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600 sm:mx-0">{content.hero.subheadline}</p>
            {currentVersion && <p className="mt-2 text-sm text-slate-400">Current version {currentVersion}</p>}
            <div className="mt-8 flex justify-center gap-4 sm:justify-start">
              <ProductPrimaryCta
                productSlug={productSlug}
                registerLabel={content.hero.primary_cta}
                className="rounded-md bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-brand-200 hover:bg-brand-700"
              />
              <a href="#features" className="rounded-md bg-white px-6 py-3 text-sm font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100">
                {content.hero.secondary_cta}
              </a>
            </div>
          </div>
          <Screenshot file={content.hero.screenshot_ref} alt={`${content.product_name} dashboard`} />
        </div>
      </section>

      {/* 2. Time-saved stat band */}
      <section className="border-y border-slate-200 bg-brand-600">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-12 text-center sm:flex-row sm:text-left">
          <p className="shrink-0 font-display text-4xl font-extrabold text-white sm:text-5xl">{content.time_saved.stat}</p>
          <div className="sm:border-l sm:border-white/30 sm:pl-6">
            <p className="font-medium text-white">{content.time_saved.label}</p>
            <p className="mt-1 text-sm text-brand-100">{content.time_saved.detail}</p>
          </div>
        </div>
      </section>

      {/* 2b. How it works (optional per product) */}
      {content.how_it_works && (
        <section className="mx-auto max-w-6xl px-4 pt-20">
          <h2 className="text-center font-display text-3xl font-bold text-slate-900">{content.how_it_works.headline}</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2">
            {content.how_it_works.steps.map((s, i) => (
              <li key={s.title}>
                <Screenshot file={s.screenshot_ref} alt={s.title} />
                <div className="mt-4 flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-900">{s.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{s.detail}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 3. Feature grid */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center font-display text-3xl font-bold text-slate-900">Everything {content.product_name} does for you</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {content.features.map((f) => (
            <Card key={f.id} className="overflow-hidden">
              <Screenshot file={f.screenshot_ref} alt={f.title} />
              <CardContent className="pt-5">
                <h3 className="font-display text-lg font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 font-medium text-slate-700">{f.pitch}</p>
                <p className="mt-2 text-sm text-slate-600">{f.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. Why choose us */}
      <section className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-2xl font-bold text-slate-900">Why teams choose {content.product_name}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {content.why_choose_us.map((w, i) => (
              <div key={w.title} className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{i + 1}</span>
                <h3 className="mt-3 font-semibold text-slate-900">{w.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{w.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Comparison table */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="text-center font-display text-2xl font-bold text-slate-900">How it compares</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500">{content.comparison.note}</p>

        <div className="mt-10 hidden overflow-hidden rounded-xl ring-1 ring-slate-200 sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="px-4 py-3 font-medium">{content.comparison.columns[0]}</th>
                <th className="bg-brand-600 px-4 py-3 font-semibold text-white">{content.comparison.columns[1]}</th>
                <th className="px-4 py-3 font-medium">{content.comparison.columns[2]}</th>
              </tr>
            </thead>
            <tbody>
              {content.comparison.rows.map(([capability, ours, theirs]) => (
                <tr key={capability} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{capability}</td>
                  <td className="bg-brand-50 px-4 py-3 text-brand-800">
                    <span className="mr-1.5 text-brand-600">✓</span>
                    {ours}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{theirs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 space-y-2 sm:hidden">
          {content.comparison.rows.map(([capability, ours, theirs]) => (
            <details key={capability} className="group rounded-lg ring-1 ring-slate-200">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-900">
                {capability}
                <span className="text-slate-400 group-open:rotate-180">⌄</span>
              </summary>
              <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-sm">
                <p className="rounded-md bg-brand-50 px-3 py-2 text-brand-800">
                  <span className="mr-1.5 text-brand-600">✓</span>
                  {ours}
                </p>
                <p className="px-3 text-slate-500">{theirs}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* 6. Pricing */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-2xl font-bold text-slate-900">Simple, transparent pricing</h2>
          <div className={`mt-10 grid gap-6 ${content.plans_summary.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {content.plans_summary.map((plan) => (
              <Card key={plan.name} className={plan.highlighted ? "overflow-hidden ring-2 ring-brand-600 shadow-xl sm:scale-105" : "overflow-hidden"}>
                <CardContent className="pt-6">
                  {plan.highlighted && (
                    <span className="inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">Most popular</span>
                  )}
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{plan.price}</p>
                  <p className="mt-4 text-sm text-slate-600">{plan.highlight}</p>
                  <a
                    href={planHref(plan, pricingHref)}
                    target={plan.cta_type === "contact" ? "_blank" : undefined}
                    rel={plan.cta_type === "contact" ? "noopener noreferrer" : undefined}
                  >
                    <Button className={plan.highlighted ? "mt-6 w-full bg-brand-600 hover:bg-brand-700" : "mt-6 w-full bg-slate-100 text-slate-900 hover:bg-slate-200"}>
                      {plan.cta_label}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">
            Full plan comparison on the{" "}
            <Link href={pricingHref} className="font-medium text-brand-600 underline">
              pricing page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="bg-brand-600 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl font-bold text-white">{content.hero.primary_cta}</h2>
          <p className="mt-2 text-brand-100">Free forever tier, no card required to start.</p>
          <div className="mt-6 flex justify-center gap-4">
            <ProductPrimaryCta
              productSlug={productSlug}
              registerLabel={content.hero.primary_cta}
              className="inline-block rounded-md bg-white px-6 py-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
            />
            <Link href="/docs" className="inline-block rounded-md bg-brand-700/40 px-6 py-3 text-sm font-medium text-white ring-1 ring-white/40 hover:bg-brand-700/60">
              Read documentation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
