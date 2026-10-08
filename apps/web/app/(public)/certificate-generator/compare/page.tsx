import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { COMPARED, CRITERIA } from "@/lib/competitors";
import { CG_OG_IMAGE, SITE_URL, breadcrumbLd } from "@/lib/site";

const TITLE = "Best WordPress Certificate Plugins & Tools Compared (2026)";
const DESCRIPTION =
  "Certificate Generator vs PressPrimer Certificate, Edutain Certificate Validator, Certifier and CertPie: bulk generation, QR verification, serial numbers, events, analytics, LocalWP and pricing.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/certificate-generator/compare" },
  openGraph: { images: [CG_OG_IMAGE], title: TITLE, description: DESCRIPTION, url: "/certificate-generator/compare", type: "article" },
};

const checkedOn = COMPARED.filter((p) => !p.ours)[0].checkedOn;

// Who each option suits — stated neutrally; each line is backed by the table below.
const fits = [
  {
    need: "Everything in one WordPress plugin — CSV import, templates, QR and serial verification, events, email delivery and analytics",
    pick: "Certificate Generator",
  },
  { need: "Free certificates issued on LMS course or quiz completion, with a polished designer", pick: "PressPrimer Certificate" },
  { need: "Only a verification lookup for certificates you already issued elsewhere", pick: "Edutain Certificate Validator (free core)" },
  { need: "A hosted platform with engagement analytics and Zapier/Make automation, no WordPress plugin", pick: "Certifier" },
  { need: "Quick hosted spreadsheet-to-PDF batches with email delivery", pick: "CertPie" },
];

// Where Certificate Generator differs — each claim links to its evidence.
const differences = [
  {
    title: "One plugin for the whole lifecycle",
    detail: "Import, design, issue, email, verify, organise by event and report — without combining plugins or a hosted service.",
    href: "/certificate-generator/certificate-management-system",
  },
  {
    title: "Email delivery built in",
    detail: "Bulk Send runs on a background queue with retries, rate limits, ZIP bundling and per-send email logs.",
    href: "/certificate-generator/bulk-certificate-generation",
  },
  {
    title: "Students, teachers and schools",
    detail: "Three recipient types, each with its own email template and front-end lookup shortcode.",
    href: "/certificate-generator/student-management",
  },
  {
    title: "CSV and LMS, together",
    detail: "Import from CSV and auto-issue from Tutor LMS, LearnDash, LifterLMS, Sensei or WooCommerce — including multi-course track certificates.",
    href: "/certificate-generator/lms-certificate-automation",
  },
  {
    title: "Self-hosted, tested on LocalWP",
    detail: "PDFs, QR codes and records stay on your own WordPress install, with a guide for building it locally.",
    href: "/docs/certificate-generator/localwp",
  },
  {
    title: "Verification, events and analytics on the Free plan",
    detail: "None of these are paid add-ons; Pro is $3.5/month for unlimited bulk operations and the REST API.",
    href: "/certificate-generator/pricing",
  },
];

const absolute = (url: string) => (url.startsWith("/") ? `${SITE_URL}${url}` : url);

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <JsonLd
        data={breadcrumbLd([
          { name: "Certificate Generator", path: "/plugins/certificate-generator" },
          { name: "Comparison", path: "/certificate-generator/compare" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: TITLE,
          itemListElement: COMPARED.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: { "@type": "SoftwareApplication", name: p.name, url: absolute(p.url), applicationCategory: "BusinessApplication" },
          })),
        }}
      />

      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">WordPress certificate plugins and tools compared</h1>
        <p className="mt-4 text-lg text-slate-700">
          There are two ways to manage certificates for a WordPress site: a plugin that runs inside WordPress, or a hosted certificate platform you
          connect to it. This page compares {COMPARED.length} options on the criteria schools, training institutes, course creators and event
          organisers usually ask about. Competitor details come from each product&apos;s official pages, checked on {checkedOn}.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-slate-900">Which one fits?</h2>
        <ul className="mt-4 space-y-3">
          {fits.map((f) => (
            <li key={f.pick} className="rounded-lg p-4 ring-1 ring-slate-200">
              <span className="text-slate-600">{f.need}:</span> <span className="font-semibold text-slate-900">{f.pick}</span>
            </li>
          ))}
        </ul>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold text-slate-900">Feature comparison</h2>
        <p className="mt-2 text-sm text-slate-500">&quot;Not documented&quot; means the product&apos;s public pages don&apos;t state it — not that it&apos;s impossible.</p>
        {/* One table for every screen size: it scrolls sideways inside this box on small screens. */}
        <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead>
              <tr className="bg-slate-50 align-bottom">
                <th scope="col" className="sticky left-0 z-10 w-28 bg-slate-50 px-3 py-3 sm:w-40 sm:px-4 font-medium text-slate-500">
                  Criteria
                </th>
                {COMPARED.map((p) => (
                  <th key={p.name} scope="col" className={`px-4 py-3 ${p.ours ? "bg-brand-600 text-white" : "text-slate-900"}`}>
                    <span className="block font-semibold">{p.name}</span>
                    <span className={`block text-xs font-normal ${p.ours ? "text-brand-100" : "text-slate-500"}`}>{p.type}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRITERIA.map((c) => (
                <tr key={c.key} className="border-t border-slate-100 align-top">
                  <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-3 text-xs font-medium text-slate-900 sm:px-4 sm:text-sm">
                    {c.label}
                  </th>
                  {COMPARED.map((p) => (
                    <td key={p.name} className={`px-4 py-3 ${p.ours ? "bg-brand-50 text-brand-900" : "text-slate-600"}`}>
                      {p.cells[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mx-auto max-w-3xl">
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-slate-900">Where Certificate Generator differs</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {differences.map((d) => (
              <li key={d.title} className="rounded-lg p-5 ring-1 ring-slate-200">
                <h3 className="font-semibold text-slate-900">{d.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{d.detail}</p>
                <Link href={d.href} className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
                  Details →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-slate-900">Sources</h2>
          <p className="mt-2 text-sm text-slate-500">
            Checked on {checkedOn}. Prices and features change — confirm on each official site. Spotted an error? Contact us and we&apos;ll correct it.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {COMPARED.map((p) => (
              <li key={p.name}>
                <span className="font-medium text-slate-900">{p.name}:</span>{" "}
                {p.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && " · "}
                    <a href={s.url} className="text-brand-600 hover:underline" {...(s.url.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}>
                      {s.label}
                    </a>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-12 text-slate-600">
          Checking requirements for your own project? See the{" "}
          <Link href="/certificate-generator/requirements" className="text-brand-600 hover:underline">
            requirements checklist
          </Link>{" "}
          or the{" "}
          <Link href="/certificate-generator/product-facts" className="text-brand-600 hover:underline">
            product facts
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
