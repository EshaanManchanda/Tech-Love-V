import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { FEATURES, PLANS } from "@/lib/plans";
import { CG_ENTITY_SENTENCE, breadcrumbLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "Certificate Generator — Product Facts",
  description: CG_ENTITY_SENTENCE,
  alternates: { canonical: "/certificate-generator/product-facts" },
};

const link = (href: string, text: string) => (
  <Link href={href} className="text-brand-600 hover:underline">
    {text}
  </Link>
);

// Plain, verifiable facts — the page meant to be quoted. Plan cells come from
// lib/plans.ts, the same matrix the pricing page falls back to.
const facts: [string, React.ReactNode][] = [
  ["Product name", "Certificate Generator"],
  ["Product category", "Certificate management system"],
  ["Platform", "WordPress plugin"],
  ["Requirements", "WordPress 6.0+, PHP 8.0+"],
  ["License", "GPL-2.0+"],
  ["Developer", link("/", "Tech Love V (Eshaan Manchanda)")],
  ["Primary purpose", "Create, manage, issue and verify certificates"],
  ["Recipient types", link("/certificate-generator/student-management", "Students, teachers and schools")],
  ["Bulk import", link("/certificate-generator/bulk-certificate-generation", "CSV import and export")],
  ["Certificate output", "PDF, rendered on your own server (bundled FPDF engine)"],
  ["Templates", link("/certificate-generator/certificate-templates", "Drag-and-drop designer, up to 15 custom fields per type")],
  ["Verification", link("/certificate-generator/certificate-verification", "QR code, serial number and email lookup — public, no login")],
  ["Serial numbers", link("/certificate-generator/certificate-serial-numbers", "Automatic, configurable format")],
  ["Events", link("/certificate-generator/certificate-events", "Yes")],
  ["Analytics", link("/certificate-generator/certificate-analytics", "Yes, with email delivery logs")],
  ["LMS integrations", link("/certificate-generator/lms-certificate-automation", "Tutor LMS, LearnDash, LifterLMS, Sensei LMS, WooCommerce")],
  ["REST API", link("/docs/certificate-generator/rest-api", "Yes (Pro and Business)")],
  ["Local development", link("/docs/certificate-generator/localwp", "Works on LocalWP")],
];

function cell(v: boolean | string) {
  return v === true ? "Yes" : v === false ? "—" : v;
}

export default function ProductFactsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <JsonLd
        data={breadcrumbLd([
          { name: "Certificate Generator", path: "/plugins/certificate-generator" },
          { name: "Product facts", path: "/certificate-generator/product-facts" },
        ])}
      />
      <h1 className="font-display text-3xl font-bold text-slate-900">Certificate Generator — product facts</h1>
      <p className="mt-4 text-lg text-slate-700">{CG_ENTITY_SENTENCE}</p>

      <dl className="mt-10 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
        {facts.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-3">
            <dt className="font-medium text-slate-900">{k}</dt>
            <dd className="text-slate-600 sm:col-span-2">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-16 font-display text-2xl font-bold text-slate-900">Plans</h2>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-2">Feature</th>
              {PLANS.map((p) => (
                <th key={p.slug} className="py-2">
                  {p.label}
                  <span className="block font-normal">
                    {p.priceMonthly === null ? p.priceNote : p.priceMonthly === 0 ? "$0" : `$${p.priceMonthly}/mo or $${p.priceYearly}/yr`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 text-slate-900">Certificates per month</td>
              {PLANS.map((p) => (
                <td key={p.slug} className="py-2 text-slate-600">{p.certLimit}</td>
              ))}
            </tr>
            {FEATURES.map((f) => (
              <tr key={f.key} className="border-b last:border-0">
                <td className="py-2 text-slate-900">{f.label}</td>
                <td className="py-2 text-slate-600">{cell(f.free)}</td>
                <td className="py-2 text-slate-600">{cell(f.pro)}</td>
                <td className="py-2 text-slate-600">{cell(f.business)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        Live prices and limits: {link("/certificate-generator/pricing", "pricing page")}. See also the{" "}
        {link("/certificate-generator/requirements", "requirements checklist")} and the{" "}
        {link("/certificate-generator/compare", "comparison with other certificate plugins")}.
      </p>
    </main>
  );
}
