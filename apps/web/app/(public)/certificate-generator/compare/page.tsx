import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd } from "@/lib/site";
import content from "../../../../../../marketing-site/content.json";

export const metadata: Metadata = {
  title: "Choosing a WordPress Certificate Plugin — Comparison",
  description:
    "What to compare when choosing a WordPress certificate plugin: PDF rendering, QR verification, LMS auto-issuance, bulk sending, REST API and pricing — and how Certificate Generator handles each.",
  alternates: { canonical: "/certificate-generator/compare" },
};

const checklist = [
  ["Where are PDFs rendered?", "A plugin that calls an external API can add per-certificate fees or fail when that service is down. Certificate Generator renders on your own server."],
  ["Can anyone verify a certificate?", "Look for a public verification page that works without a login, and check whether it is gated to a paid plan."],
  ["Does it connect to your LMS?", "Auto-issuance on course completion removes manual work. Check which LMS plugins are supported, not just one."],
  ["How does bulk sending work?", "Sending hundreds of emails synchronously can time out. A background queue with retries is safer."],
  ["Is pricing public?", "Transparent tiers make it easy to budget; quote-only pricing often does not."],
];

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <JsonLd
        data={breadcrumbLd([
          { name: "Certificate Generator", path: "/plugins/certificate-generator" },
          { name: "Comparison", path: "/certificate-generator/compare" },
        ])}
      />
      <h1 className="font-display text-3xl font-bold text-slate-900">How to choose a WordPress certificate plugin</h1>
      <p className="mt-4 text-lg text-slate-700">
        Most WordPress certificate plugins can put a name on a PDF. The differences show up in verification, automation, bulk delivery and pricing. Here is
        what to check, and how Certificate Generator compares with typical plugins in the category.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-slate-900">Questions to ask</h2>
        <dl className="mt-6 space-y-5">
          {checklist.map(([q, a]) => (
            <div key={q}>
              <dt className="font-medium text-slate-900">{q}</dt>
              <dd className="mt-1 text-slate-600">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-slate-900">Certificate Generator vs. typical certificate plugins</h2>
        <p className="mt-2 text-sm text-slate-500">{content.comparison.note}</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                {content.comparison.columns.map((c) => (
                  <th key={c} className="py-2 pr-4">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.comparison.rows.map(([cap, ours, theirs]) => (
                <tr key={cap} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-900">{cap}</td>
                  <td className="py-2 pr-4 text-slate-700">{ours}</td>
                  <td className="py-2 text-slate-500">{theirs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-12 text-slate-600">
        See the full{" "}
        <Link href="/certificate-generator/product-facts" className="text-brand-600 hover:underline">
          product facts
        </Link>{" "}
        or{" "}
        <Link href="/certificate-generator/pricing" className="text-brand-600 hover:underline">
          pricing
        </Link>
        .
      </p>
    </main>
  );
}
