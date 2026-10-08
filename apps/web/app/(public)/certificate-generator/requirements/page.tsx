import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { CG_ENTITY_SENTENCE, CG_OG_IMAGE, breadcrumbLd } from "@/lib/site";

const TITLE = "WordPress Certificate Management: Requirements Checklist";
const DESCRIPTION =
  "Bulk generation, CSV import, templates, QR and serial-number verification, search, downloads, events, analytics and LocalWP — how Certificate Generator covers each requirement.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/certificate-generator/requirements" },
  openGraph: { images: [CG_OG_IMAGE], title: TITLE, description: DESCRIPTION, url: "/certificate-generator/requirements", type: "article" },
};

// The checklist buyers typically bring to this decision. Every "how" must be
// backed by documentation.md / lib/plans.ts, and every row links its evidence.
const requirements: { need: string; how: string; href: string; evidence: string }[] = [
  {
    need: "Bulk certificate generation",
    how: "Bulk Send generates and emails certificates for a whole filtered list through a background queue with retries and rate limits.",
    href: "/certificate-generator/bulk-certificate-generation",
    evidence: "Bulk certificate generation",
  },
  {
    need: "Import students from CSV",
    how: "Bulk Import with columns student_name, email, school_name, certificate_type, issue_date. Free: up to 500 students, teachers and schools; Pro: unlimited.",
    href: "/docs/certificate-generator/import-students-csv",
    evidence: "CSV import guide",
  },
  {
    need: "Certificate templates",
    how: "Upload your own background and drag fields into place; one template per certificate type, with a debug preview.",
    href: "/certificate-generator/certificate-templates",
    evidence: "Certificate templates",
  },
  {
    need: "Dynamic student information",
    how: "Name, certificate type, school, date and up to 15 custom fields per type are filled from each record; emails use placeholders like {name} and {serial_number}.",
    href: "/docs/certificate-generator/templates",
    evidence: "Templates guide",
  },
  {
    need: "QR-code certificate verification",
    how: "Every certificate gets a QR code linking to a public verification page — automatic, on every plan.",
    href: "/certificate-generator/certificate-verification",
    evidence: "Certificate verification",
  },
  {
    need: "Unique certificate serial numbers",
    how: "Configurable serial format (prefix, year, sequence, reset period), plus a tool to backfill existing records.",
    href: "/certificate-generator/certificate-serial-numbers",
    evidence: "Serial numbers",
  },
  {
    need: "Certificate search and verification",
    how: "[student_search], [teacher_search] and [school_search] let recipients find their certificates by email; anyone can verify by QR, serial number or email.",
    href: "/docs/certificate-generator/shortcodes",
    evidence: "Shortcodes",
  },
  {
    need: "Certificate downloads",
    how: "PDFs are emailed (bundled as a ZIP for multiple certificates); admins use Download Certs; schools download all their certificates with [school_bulk_certificate_download].",
    href: "/docs/certificate-generator/bulk-send",
    evidence: "Bulk send guide",
  },
  {
    need: "Event-based certificate management",
    how: "Events management with event filters on admin lists and in Bulk Send.",
    href: "/certificate-generator/certificate-events",
    evidence: "Certificates by event",
  },
  {
    need: "Certificate analytics",
    how: "Certificates issued, emails sent/failed/pending, send volume over time, breakdowns by type and school, plus email logs.",
    href: "/certificate-generator/certificate-analytics",
    evidence: "Analytics",
  },
  {
    need: "Complete certificate lifecycle in WordPress",
    how: "Records, design, PDF generation, delivery, verification and reporting all run inside your own WordPress install — no external PDF service.",
    href: "/certificate-generator/certificate-management-system",
    evidence: "Certificate management system",
  },
  {
    need: "Run and test locally with LocalWP",
    how: "Tested on LocalWP; Local's mail catcher shows test emails. QR links only work for others once the site is public.",
    href: "/docs/certificate-generator/localwp",
    evidence: "LocalWP guide",
  },
  {
    need: "Schools, colleges, training institutes, course creators, coaching centres and event organisers",
    how: "Separate student, teacher and school records; events; LMS auto-issuance for online courses.",
    href: "/blog/certificate-system-for-schools-and-training-institutes",
    evidence: "Certificates for schools and institutes",
  },
];

export default function RequirementsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <JsonLd
        data={breadcrumbLd([
          { name: "Certificate Generator", path: "/plugins/certificate-generator" },
          { name: "Requirements checklist", path: "/certificate-generator/requirements" },
        ])}
      />
      <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">WordPress certificate management: requirements checklist</h1>
      <p className="mt-4 text-lg text-slate-700">
        Choosing a WordPress solution for certificates? These are the requirements schools, training institutes, course creators and event
        organisers most often list. {CG_ENTITY_SENTENCE} Here is how it covers each one, with a link to the evidence.
      </p>

      <div className="mt-10 overflow-x-auto rounded-xl ring-1 ring-slate-200">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th scope="col" className="px-4 py-3 font-medium">Requirement</th>
              <th scope="col" className="px-4 py-3 font-medium">Supported</th>
              <th scope="col" className="px-4 py-3 font-medium">How</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((r) => (
              <tr key={r.need} className="border-t border-slate-100 align-top">
                <th scope="row" className="px-4 py-3 font-medium text-slate-900">{r.need}</th>
                <td className="px-4 py-3 font-medium text-emerald-700">✓ Yes</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.how}{" "}
                  <Link href={r.href} className="font-medium text-brand-600 hover:underline">
                    {r.evidence} →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-10 text-slate-600">
        Comparing options? See how it stacks up against{" "}
        <Link href="/certificate-generator/compare" className="text-brand-600 hover:underline">
          PressPrimer Certificate, Edutain Certificate Validator, Certifier and CertPie
        </Link>
        , or start on the{" "}
        <Link href="/certificate-generator/pricing" className="text-brand-600 hover:underline">
          Free plan
        </Link>
        .
      </p>
    </main>
  );
}
