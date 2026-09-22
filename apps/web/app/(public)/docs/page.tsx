import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

const badges = ["Version 7.5", "WordPress 6.0+", "PHP 8.0+", "GPL-2.0+"];

const quickNav = [
  { href: "#getting-started", label: "Getting Started" },
  { href: "#features", label: "Features" },
  { href: "#shortcodes", label: "Shortcodes" },
  { href: "#rest-api", label: "REST API" },
  { href: "#faq", label: "FAQ" },
];

const gettingStarted = [
  { title: "Configure SMTP", desc: "Install the free WP Mail SMTP plugin, set the mailer to your provider, and set From Email to match your authenticated SMTP account.", bg: "bg-indigo-600" },
  { title: "Create a certificate template", desc: "Upload your background image and position the Name, Certificate Type, School, and Date fields on the canvas.", bg: "bg-emerald-600" },
  { title: "Add students", desc: "Add records manually, or use Bulk Import to upload a CSV (student_name, email, school_name, certificate_type, issue_date).", bg: "bg-amber-600" },
  { title: "Send a test email", desc: "Go to Settings → Email and use Send Test Email to verify delivery before going live.", bg: "bg-rose-600" },
  { title: "Bulk send", desc: "Go to Bulk Send, filter by school or certificate type, and click Send Certificates.", bg: "bg-violet-600" },
];

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

const shortcodes = [
  { code: "[student_search]", desc: "Front-end search form for a student to look up their own certificate(s) by email." },
  { code: "[teacher_search]", desc: "Same lookup flow for teachers." },
  { code: "[school_search]", desc: "Same lookup flow for schools, by school name and place." },
  { code: "[school_bulk_certificate_download]", desc: "Lets a school download all of its certificates in bulk (ZIP) from the front end." },
  { code: "[cg_verify_certificate]", desc: "Public certificate authenticity verification form, reachable via a certificate's QR code." },
];

const restApi = [
  { method: "POST", route: "/issue-certificate", auth: "Bearer token", notes: "Gated to Pro / Business. Generates and emails/zips certificates by student email." },
  { method: "GET", route: "/health", auth: "None", notes: "Liveness check." },
  { method: "POST", route: "/validate-key", auth: "Bearer token", notes: "Validates an API key." },
  { method: "GET", route: "/certificates-by-email", auth: "Bearer token", notes: "Read-only lookup — does not regenerate certificates." },
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

      <nav className="mt-8 flex flex-wrap justify-center gap-2">
        {quickNav.map((n) => (
          <a key={n.href} href={n.href} className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
            {n.label}
          </a>
        ))}
      </nav>

      <section id="getting-started" className="mt-16 scroll-mt-20">
        <h2 className="font-display text-2xl font-bold text-slate-900">Getting started</h2>
        <p className="mt-1 text-slate-600">A 5-step quick start from install to your first bulk send.</p>
        <ol className="mt-6 space-y-4">
          {gettingStarted.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-semibold text-white ${s.bg}`}>
                {i + 1}
              </span>
              <div>
                <h3 className="font-medium text-slate-900">{s.title}</h3>
                <p className="text-sm text-slate-600">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
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

      <section id="shortcodes" className="mt-16 scroll-mt-20">
        <h2 className="font-display text-2xl font-bold text-slate-900">Shortcodes</h2>
        <p className="mt-1 text-slate-600">Drop any of these into a page or post via the block or classic editor.</p>
        <div className="mt-6 space-y-3">
          {shortcodes.map((s) => (
            <Card key={s.code}>
              <CardContent className="flex flex-col gap-1 pt-6 sm:flex-row sm:items-center sm:gap-4">
                <code className="flex-none rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800">{s.code}</code>
                <p className="text-sm text-slate-600">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="rest-api" className="mt-16 scroll-mt-20">
        <h2 className="font-display text-2xl font-bold text-slate-900">REST API</h2>
        <p className="mt-1 text-slate-600">
          Namespace <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">certificate-generator/v1</code>. Requires a bearer token unless noted.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Method</th>
                <th className="py-2">Route</th>
                <th className="py-2">Auth</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {restApi.map((r) => (
                <tr key={r.route} className="border-b last:border-0">
                  <td className="py-2 font-mono text-xs text-indigo-700">{r.method}</td>
                  <td className="py-2 font-mono text-xs text-slate-800">{r.route}</td>
                  <td className="py-2 text-slate-600">{r.auth}</td>
                  <td className="py-2 text-slate-600">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        <Link href="/pricing" className="mt-4 inline-block rounded-md bg-white px-6 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
          View plans
        </Link>
      </div>
    </main>
  );
}
