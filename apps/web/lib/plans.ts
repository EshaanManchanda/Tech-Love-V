// Loading-state fallback only — the live source of truth is now the
// GET /api/plans/compare endpoint (backed by the Plan/Feature/PlanFeature
// collections, seeded from CG_License_Manager::get_plan_features()). Keep
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
  certLimit: string; // "100/mo" | "1,000/mo" | "Unlimited"
  bulkCap: string; // "250 rows" | "Unlimited"
  cta: { label: string; type: "checkout" | "contact" | "register" };
  highlight?: boolean;
}

export const PLANS: PlanCopy[] = [
  {
    slug: "free",
    label: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    certLimit: "100/mo",
    bulkCap: "250 rows",
    cta: { label: "Get started free", type: "register" },
  },
  {
    slug: "pro",
    label: "Pro",
    priceMonthly: 3.5,
    priceYearly: 35,
    certLimit: "1,000/mo",
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
  { key: "basic_pdf", label: "PDF certificate generation", free: true, pro: true, business: true },
  { key: "manual_issue", label: "Manual certificate issuing", free: true, pro: true, business: true },
  { key: "lms_integrations", label: "Tutor LMS, LearnDash, LifterLMS, Sensei LMS and WooCommerce", free: true, pro: true, business: true },
  { key: "track_certificates", label: 'Multi-course "track" certificates', free: true, pro: true, business: true },
  { key: "verification", label: "QR code verification ([cg_verify_certificate])", free: true, pro: true, business: true },
  { key: "revocation", label: "Certificate revocation (shown as revoked on verify)", free: true, pro: true, business: true },
  { key: "linkedin", label: 'LinkedIn "Add to Profile" button', free: true, pro: true, business: true },
  { key: "search_shortcode", label: "Search shortcodes ([student_search], [teacher_search], [school_search])", free: true, pro: true, business: true },
  { key: "analytics", label: "Certificate analytics dashboard", free: true, pro: true, business: true },
  { key: "getting_started", label: "Getting Started checklist", free: true, pro: true, business: true },
  { key: "admin_bulk_actions", label: "Bulk edit, bulk email and event filtering on admin lists", free: true, pro: true, business: true },
  { key: "bulk_send_filters", label: "Bulk Send filters (event, import source) + recipient preflight", free: true, pro: true, business: true },
  { key: "events", label: "Events management", free: true, pro: true, business: true },
  { key: "bulk_import", label: "CSV bulk import/export", free: "Capped", pro: true, business: true },
  { key: "bulk_zip", label: "Bulk ZIP download", free: false, pro: true, business: true },
  { key: "email_templates", label: "Email templates", free: false, pro: true, business: true },
  { key: "api_access", label: "REST API", free: false, pro: true, business: true },
  { key: "smtp_tools", label: "SMTP diagnostics", free: false, pro: true, business: true },
  { key: "renewal_reminders", label: "Renewal reminders", free: false, pro: true, business: true },
  { key: "priority_support", label: "Priority support", free: false, pro: true, business: true },
  { key: "custom_font_upload", label: "Custom font upload", free: false, pro: false, business: true },
  { key: "unlimited_api", label: "Unlimited API calls", free: false, pro: false, business: true },
  { key: "multisite", label: "Multisite", free: false, pro: false, business: true },
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
