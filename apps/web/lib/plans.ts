// Loading-state fallback only — the live source of truth is now the
// GET /api/plans/compare endpoint (backed by the Plan/Feature/PlanFeature
// collections, seeded by apps/api/src/scripts/seed-plans.ts). Keep
// this in sync as a sane default for the instant before that request resolves.

export type WebPlanSlug = "free" | "pro" | "business";
// "free" is marketing-only — apps/api/src/config/plans.ts has no matching license tier;
// the plugin works with zero license key by default.

export interface PlanCopy {
  slug: WebPlanSlug;
  label: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  priceNote?: string; // e.g. "Contact for pricing"
  certLimit: string; // "Unlimited" on every plan since the free plugin dropped its caps (7.6)
  bulkCap: string;
  cta: { label: string; type: "checkout" | "contact" | "register" };
  highlight?: boolean;
}

export const PLANS: PlanCopy[] = [
  {
    slug: "free",
    label: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    certLimit: "Unlimited",
    bulkCap: "Unlimited",
    cta: { label: "Download free", type: "register" },
  },
  {
    slug: "pro",
    label: "Pro",
    priceMonthly: 3.5,
    priceYearly: 35,
    certLimit: "Unlimited",
    bulkCap: "Unlimited",
    cta: { label: "Subscribe", type: "checkout" },
    highlight: true,
  },
  {
    slug: "business",
    label: "Business",
    priceMonthly: null,
    priceYearly: null,
    priceNote: "Contact for pricing",
    certLimit: "Unlimited",
    bulkCap: "Unlimited",
    cta: { label: "Contact us", type: "contact" },
  },
];

export interface FeatureRow {
  key: string;
  label: string;
  free: boolean | string;
  pro: boolean | string;
  business: boolean | string;
}

export const FEATURES: FeatureRow[] = [
  // Free plugin — the complete certificate tool, nothing capped or locked
  { key: "basic_pdf", label: "PDF generation, manual issue, 27 built-in fonts", free: true, pro: true, business: true },
  { key: "unicode_names", label: "Names in any language (Indian scripts, Urdu / Arabic, Cyrillic, …)", free: true, pro: true, business: true },
  { key: "template_builder", label: "Drag-and-drop templates: per-field fonts, custom-text fields with {field} tags", free: true, pro: true, business: true },
  { key: "badges_signatures", label: "Digital badges, image / e-signature fields", free: true, pro: true, business: true },
  { key: "bulk_import", label: "Students, teachers, schools: CSV import & export", free: "No row limit", pro: true, business: true },
  { key: "import_check", label: "Import check before saving: column mapping, encoding / delimiter detection, sample CSVs", free: true, pro: true, business: true },
  { key: "email_sending", label: "Certificate email, bulk send and background queue", free: "No monthly limit", pro: true, business: true },
  { key: "email_templates", label: "Email templates (placeholders, CC/BCC) and SMTP / Sender.net / Mandrill", free: true, pro: true, business: true },
  { key: "renewal_reminders", label: "Recipient renewal reminders", free: true, pro: true, business: true },
  { key: "verification", label: "QR verification page with unguessable codes, LinkedIn / X / WhatsApp sharing", free: true, pro: true, business: true },
  { key: "revocation", label: "Certificate history, revoke / reinstate, reissue (issued certificates keep their layout)", free: true, pro: true, business: true },
  { key: "search_shortcode", label: "Student / teacher / school search and My Certificates shortcodes", free: true, pro: true, business: true },
  { key: "bulk_zip", label: "Bulk certificate ZIP download (admin)", free: true, pro: true, business: true },
  { key: "analytics", label: "Analytics, email logs, serial numbers", free: true, pro: true, business: true },
  { key: "privacy_tools", label: "WordPress privacy export / erase", free: true, pro: true, business: true },
  // Pro add-on
  { key: "lms_integrations", label: "Auto-issue from Tutor LMS, LearnDash, LifterLMS, Sensei LMS, LearnPress", free: false, pro: true, business: true },
  { key: "woocommerce", label: "Auto-issue on WooCommerce order completion", free: false, pro: true, business: true },
  { key: "past_completions", label: '"Issue to past completions" backfill', free: false, pro: true, business: true },
  { key: "custom_font_upload", label: "Custom font upload (.ttf)", free: false, pro: true, business: true },
  { key: "api_access", label: "REST API (issue certificates, look up by email)", free: false, pro: true, business: true },
  { key: "school_zip_shortcode", label: "School bulk ZIP shortcode [school_bulk_certificate_download]", free: false, pro: true, business: true },
  { key: "priority_support", label: "Priority support", free: false, pro: true, business: true },
  { key: "sites", label: "Sites per license key", free: "Unlimited (no key)", pro: "1", business: "5" },
];

export const CONTACT_URL = "https://eshaanportfolio.vercel.app/contact";

// Dynamic Tags — second product, only two plans, so its own small shapes
// rather than force-fitting the three-tier PlanCopy/FeatureRow above.
export interface DtPlanCopy {
  slug: "free" | "paid";
  label: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  cta: { label: string; type: "checkout" | "register" };
  highlight?: boolean;
}

export const DT_PLANS: DtPlanCopy[] = [
  { slug: "free", label: "Free", priceMonthly: 0, priceYearly: 0, cta: { label: "Get started free", type: "register" } },
  { slug: "paid", label: "Paid", priceMonthly: 2, priceYearly: 19, cta: { label: "Subscribe", type: "checkout" }, highlight: true },
];

export interface DtFeatureRow {
  key: string;
  label: string;
  free: boolean | string;
  paid: boolean | string;
}

export const DT_FEATURES: DtFeatureRow[] = [
  { key: "dt_tag_limit", label: "Dynamic tags", free: "Up to 15", paid: "Unlimited" },
  { key: "dt_woocommerce", label: "WooCommerce fields", free: false, paid: true },
  { key: "dt_acf_arrays", label: "ACF repeater/gallery/relationship", free: false, paid: true },
  { key: "dt_loop", label: "[dt_loop] — iterate any array source", free: false, paid: true },
  { key: "dt_conditionals_field", label: "Field-based conditionals", free: false, paid: true },
  { key: "dt_template", label: "[dt_template] — per-record rendering", free: false, paid: true },
  { key: "dt_query_api", label: "{query:...} / {api:...} data sources", free: false, paid: true },
  { key: "dt_support", label: "Support", free: "Community", paid: "Priority email" },
];
