import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CG_DOCS } from "@/lib/cg-docs";
import { YOUTUBE_PLAYLIST } from "@/lib/site";

export const metadata: Metadata = {
  title: "Certificate Generator Documentation",
  description: "Documentation for Certificate Generator for WordPress: installation, templates, CSV import, bulk send, QR verification, serial numbers, events, analytics, shortcodes and REST API.",
  alternates: { canonical: "/docs" },
};

const badges = ["Version 7.5", "WordPress 6.0+", "PHP 8.0+", "GPL-2.0+"];

const features = [
  "Certificate templates — drag-position fields, per-field font/size/colour",
  "PDF generation via a bundled FPDF engine — no TCPDF/mPDF dependency",
  "QR-code verification on every certificate",
  "Auto-generated, configurable serial numbers",
  "Student / Teacher / School management, manual or bulk CSV",
  "Bulk email sending with a background queue and retry backoff",
  "Automatic ZIP bundling for recipients with multiple certificates",
  "Email logs & analytics dashboard",
  "Public verification & search shortcodes — no login required",
  "REST API for external integrations",
  "Free / Pro / Business licensing tiers",
  "External sync with a companion GEMA backend",
];

const faqs = [
  { q: "Can I send certificates to teachers and schools too, not just students?", a: "Yes — the bulk send page lets you choose the entity type before filtering, and each entity type has its own email template." },
  { q: "Will re-sending skip students who already received their certificate?", a: "Yes — \"Skip already sent\" (checked by default) checks the email log and skips recipients with a sent entry for their certificate." },
  { q: "Can I use a Gmail account to send emails?", a: "Yes, but Gmail requires an App Password. In WP Mail SMTP, choose Gmail as the mailer, use smtp.gmail.com on port 587, and your App Password." },
  { q: "How do I change the certificate PDF design?", a: "Edit the template — upload a new background and reposition fields. Future PDFs use the new design; already-generated PDFs are unchanged." },
  { q: "Can students verify their certificate online?", a: "Yes — every certificate's QR code links to a public verification page, and visitors can also search by serial number or email." },
  { q: "Is the plugin multisite compatible?", a: "Partially — designed for single-site use. Network-wide activation requires the Business plan; Free/Pro network-activated installs track usage per site independently." },
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-center font-display text-3xl font-bold text-slate-900">Documentation</h1>
      <p className="mt-2 text-center text-slate-600">
        Everything you need to install, configure, and run Certificate Generator.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {badges.map((b) => (
          <span key={b} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {b}
          </span>
        ))}
      </div>

      <p className="mt-4 text-center">
        <a href={YOUTUBE_PLAYLIST} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-600 hover:underline">
          ▶ Watch the video tutorial series
        </a>
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-slate-900">Guides</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {CG_DOCS.map((d) => (
            <li key={d.slug}>
              <Link href={`/docs/certificate-generator/${d.slug}`} className="block h-full rounded-lg p-4 ring-1 ring-slate-200 hover:bg-slate-50">
                <span className="font-medium text-slate-900">{d.title}</span>
                <span className="mt-1 block text-sm text-slate-600">{d.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="features" className="mt-16 scroll-mt-20">
        <h2 className="font-display text-2xl font-bold text-slate-900">Features</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-0.5 text-emerald-600">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section id="faq" className="mt-16 scroll-mt-20">
        <h2 className="font-display text-2xl font-bold text-slate-900">FAQ</h2>
        <div className="mt-6 space-y-4">
          {faqs.map((f) => (
            <Card key={f.q}>
              <CardContent className="pt-6">
                <h3 className="font-medium text-slate-900">{f.q}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-16 rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500 px-6 py-10 text-center">
        <h2 className="font-display text-xl font-bold text-white">Ready to license Certificate Generator?</h2>
        <Link href="/certificate-generator/pricing" className="mt-4 inline-block rounded-md bg-white px-6 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
          View plans
        </Link>
      </div>
    </main>
  );
}
