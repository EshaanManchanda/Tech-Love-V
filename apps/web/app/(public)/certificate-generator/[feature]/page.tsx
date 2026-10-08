import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ProductPrimaryCta } from "@/components/product-primary-cta";
import { Screenshot } from "@/components/product-landing";
import { CG_FEATURES, getCgFeature } from "@/lib/cg-features";
import { OG_IMAGE, breadcrumbLd } from "@/lib/site";

export const dynamicParams = false; // unknown slugs 404 instead of rendering an empty page

export function generateStaticParams() {
  return CG_FEATURES.map((f) => ({ feature: f.slug }));
}

export function generateMetadata({ params }: { params: { feature: string } }): Metadata {
  const f = getCgFeature(params.feature);
  if (!f) return {};
  const path = `/certificate-generator/${f.slug}`;
  return {
    title: f.title,
    description: f.description,
    alternates: { canonical: path },
    openGraph: { images: [OG_IMAGE], title: f.title, description: f.description, url: path, type: "article" },
  };
}

export default function FeaturePage({ params }: { params: { feature: string } }) {
  const f = getCgFeature(params.feature);
  if (!f) return notFound();
  const related = f.related.map(getCgFeature).filter((r) => r !== undefined);

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <JsonLd
        data={breadcrumbLd([
          { name: "Certificate Generator", path: "/plugins/certificate-generator" },
          { name: f.h1, path: `/certificate-generator/${f.slug}` },
        ])}
      />
      <nav className="text-sm text-slate-500">
        <Link href="/plugins/certificate-generator" className="hover:text-slate-900">Certificate Generator</Link> / <span>{f.h1}</span>
      </nav>

      <h1 className="mt-4 font-display text-3xl font-bold text-slate-900 sm:text-4xl">{f.h1}</h1>
      <p className="mt-4 text-lg text-slate-700">{f.answer}</p>

      {f.sections.map((s) => (
        <section key={s.h2} className="mt-12">
          <h2 className="font-display text-2xl font-bold text-slate-900">{s.h2}</h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="mt-3 text-slate-600">{p}</p>
          ))}
          {s.screenshot && (
            <div className="mt-6">
              <Screenshot file={s.screenshot} alt={s.h2} />
            </div>
          )}
        </section>
      ))}

      {f.steps && (
        <section className="mt-12 rounded-lg bg-slate-50 p-6 ring-1 ring-slate-200">
          <h2 className="font-display text-xl font-bold text-slate-900">{f.steps.heading}</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700">
            {f.steps.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-slate-900">Documentation</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {f.docs.map((d) => (
            <li key={d.slug}>
              <Link href={`/docs/certificate-generator/${d.slug}`} className="inline-block rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
                {d.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-slate-900">Related features</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/certificate-generator/${r.slug}`} className="block rounded-lg p-4 ring-1 ring-slate-200 hover:bg-slate-50">
                  <span className="font-medium text-slate-900">{r.h1}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-12 text-sm text-slate-600">
        Evaluating options? See the{" "}
        <Link href="/certificate-generator/requirements" className="font-medium text-brand-600 hover:underline">requirements checklist</Link> or{" "}
        <Link href="/certificate-generator/compare" className="font-medium text-brand-600 hover:underline">how Certificate Generator compares</Link> with other
        certificate plugins.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4 rounded-lg bg-brand-600 px-6 py-8">
        <p className="flex-1 font-display text-lg font-bold text-white">Free plan available — no card required.</p>
        <ProductPrimaryCta
          productSlug="certificate-generator"
          registerLabel="Get Certificate Generator"
          className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
        />
        <Link href="/certificate-generator/pricing" className="text-sm font-medium text-white underline">See pricing</Link>
      </div>
    </main>
  );
}
