// Named comparison of WordPress certificate solutions, used by
// /certificate-generator/compare and /llms.txt.
//
// Every competitor cell must come from that product's own public pages,
// listed in `sources`, as of `checkedOn`. If a fact isn't stated there, write
// "Not documented" — never infer. Re-check before changing a cell, and bump
// checkedOn. Certificate Generator's column comes from documentation.md and
// lib/plans.ts.

export const CRITERIA = [
  { key: "bulk", label: "Bulk certificate generation" },
  { key: "recipients", label: "Student / recipient management" },
  { key: "templates", label: "Certificate templates" },
  { key: "qr", label: "QR-code verification" },
  { key: "serial", label: "Serial number / ID verification" },
  { key: "events", label: "Events & bulk management" },
  { key: "analytics", label: "Analytics" },
  { key: "wordpress", label: "WordPress integration" },
  { key: "localwp", label: "LocalWP / local testing" },
  { key: "pricing", label: "Pricing" },
  { key: "setup", label: "Setup" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

export interface ComparedProduct {
  name: string;
  url: string;
  type: "WordPress plugin" | "Hosted SaaS";
  ours?: boolean;
  checkedOn: string; // YYYY-MM-DD
  sources: { label: string; url: string }[];
  cells: Record<CriterionKey, string>;
}

const CHECKED_ON = "2026-10-08";

export const COMPARED: ComparedProduct[] = [
  {
    name: "Certificate Generator",
    url: "/plugins/certificate-generator",
    type: "WordPress plugin",
    ours: true,
    checkedOn: CHECKED_ON,
    sources: [
      { label: "Product facts", url: "/certificate-generator/product-facts" },
      { label: "Documentation", url: "/docs" },
    ],
    cells: {
      bulk: "CSV import, then Bulk Send through a background queue with retries, rate limits and ZIP bundling. Free: 500 records per type, 250 emails/month; Pro: unlimited.",
      recipients: "Separate Students, Teachers and Schools records — added manually, by CSV, or automatically from your LMS.",
      templates: "Drag-and-drop field designer on your own background image, up to 15 custom fields per certificate type, debug preview. Custom font upload on Business.",
      qr: "QR code on every certificate linking to a public verification page. All plans, including Free.",
      serial: "Configurable serial format (e.g. PREFIX-2026-00142); search by serial or email; public /verify/{serial} endpoint.",
      events: "Events management; filter admin lists and Bulk Send by event or import source; bulk edit and bulk email. All plans.",
      analytics: "Certificates issued, emails sent/failed/pending, volume over time, breakdown by type and school, expiry reports, email logs. All plans.",
      wordpress: "Native plugin. Auto-issues from Tutor LMS, LearnDash, LifterLMS, Sensei LMS and WooCommerce. Search/verify shortcodes. REST API on Pro.",
      localwp: "Tested on LocalWP, with a setup guide. Public QR verification needs a live site.",
      pricing: "Free; Pro $3.5/month or $35/year; Business: contact.",
      setup: "Install the plugin ZIP, follow the 5-step Getting Started checklist. Needs SMTP for email delivery.",
    },
  },
  {
    name: "PressPrimer Certificate",
    url: "https://wordpress.org/plugins/pressprimer-certificate/",
    type: "WordPress plugin",
    checkedOn: CHECKED_ON,
    sources: [
      { label: "WordPress.org listing", url: "https://wordpress.org/plugins/pressprimer-certificate/" },
      { label: "Add-on pricing", url: "https://pressprimer.com/pressprimer-certificate/" },
    ],
    cells: {
      bulk: "Issues certificates automatically on LMS/quiz completion. Bulk awarding from a user list or CSV is in the paid Educator add-on.",
      recipients: "Awards to learners from integrated LMS and quiz plugins; no separate recipient database documented.",
      templates: "Drag-and-drop designer with 8 starter designs. Custom fonts and multi-page certificates in Educator add-on.",
      qr: "Optional QR code on every certificate linking to its verification page (free).",
      serial: "Unique, non-guessable credential IDs with typo detection (free).",
      events: "Not documented as an event feature. School add-on adds issuing organizations and program pages.",
      analytics: "Dashboard with certificate statistics and an awarded-over-time chart (free).",
      wordpress: "Native plugin. Integrates with LearnDash, LifterLMS, Tutor LMS, LearnPress, PressPrimer Quiz and Assignment. Emails a PDF on issue.",
      localwp: "Self-hosted WordPress plugin; LocalWP not specifically documented.",
      pricing: "Free on WordPress.org. Add-ons: Educator $99/yr, School $149/yr, Enterprise $249/yr (list prices; introductory $49/$79/$149).",
      setup: "Install from WordPress.org. Requires WordPress 6.4+ and PHP 7.4+.",
    },
  },
  {
    name: "Edutain Certificate Validator",
    url: "https://wordpress.org/plugins/edutain-certificate-validator/",
    type: "WordPress plugin",
    checkedOn: CHECKED_ON,
    sources: [{ label: "WordPress.org listing", url: "https://wordpress.org/plugins/edutain-certificate-validator/" }],
    cells: {
      bulk: "Imports certificate records from CSV (up to 100,000 rows / 10 MB per file) for verification. PDF certificate generation is Pro.",
      recipients: "Certificate records table; Pro adds bulk edit and up to 30 custom fields.",
      templates: "Pro: landscape PDF with logo, accent color, signature and QR. No template library documented.",
      qr: "Pro only (QR generator with PNG/PDF downloads).",
      serial: "Verifies a unique certificate code per record via the [edcv_validator] form (free).",
      events: "Not documented. Pro adds bulk delete and bulk edit of status/expiry.",
      analytics: "Pro: verification logs, failed attempts, most-verified codes.",
      wordpress: "Native plugin; shortcode and an auto-created Validate Certificate page. No LMS integration documented.",
      localwp: "Self-hosted WordPress plugin; LocalWP not specifically documented.",
      pricing: "Free core; Pro price not stated on the WordPress.org listing.",
      setup: "Install from WordPress.org, upload a CSV. Requires WordPress 5.0+ and PHP 7.2+.",
    },
  },
  {
    name: "Certifier",
    url: "https://certifier.io",
    type: "Hosted SaaS",
    checkedOn: CHECKED_ON,
    sources: [{ label: "Pricing page", url: "https://certifier.io/pricing" }],
    cells: {
      bulk: "Bulk recipient upload and mass credential generation in a hosted dashboard.",
      recipients: "Hosted recipient management with delivery and engagement tracking.",
      templates: "Hosted designer with QR codes. Custom fonts are a $99/month add-on.",
      qr: "QR code verification (Professional plan).",
      serial: "Hosted credential verification page per credential.",
      events: "Not documented on the pricing page.",
      analytics: "Advanced analytics (Professional), delivery analytics, recipient engagement breakdown, export.",
      wordpress: "No WordPress plugin documented; connects via Zapier, Make, Pipedream or its API.",
      localwp: "Hosted service — not installed in WordPress.",
      pricing: "Free plan up to 250 credentials/year; Professional $89/month ($76/month billed yearly).",
      setup: "Sign up online; WordPress automation through Zapier/Make/API.",
    },
  },
  {
    name: "CertPie",
    url: "https://certpie.com",
    type: "Hosted SaaS",
    checkedOn: CHECKED_ON,
    sources: [{ label: "Website & pricing", url: "https://certpie.com" }],
    cells: {
      bulk: "Bulk generation from CSV or Excel — one certificate per row.",
      recipients: "Recipients come from the uploaded spreadsheet; email delivery and ZIP export.",
      templates: "Drag-and-drop editor with text, images, signatures and QR placeholders. Free: 3 custom templates.",
      qr: "QR code on every certificate linking to a public verification page.",
      serial: "Each certificate has its own number shown on the verification page.",
      events: "Certificates are grouped in batches; no separate events feature documented.",
      analytics: "Not documented.",
      wordpress: "No WordPress plugin or Zapier integration documented; API listed as \"coming soon\".",
      localwp: "Hosted service — not installed in WordPress.",
      pricing: "Free: 30 certificates/month with watermark. Pro ₹999/month (500/month). Business ₹2,499/month.",
      setup: "Sign up online and upload a spreadsheet.",
    },
  },
];
