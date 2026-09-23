/**
 * Seeds Product/Plan/Feature/PlanFeature — the DB-driven source of truth for the
 * marketing site's pricing/comparison display. Idempotent (upserts by slug/key).
 *
 * The feature matrix mirrors the plugin's actual
 * CG_License_Manager::get_plan_features() (includes/Core/license-manager.php)
 * 1:1, so the website and the plugin's own License tab never drift apart.
 *
 * Usage: npx tsx src/scripts/seed-plans.ts
 */
import "dotenv/config";
import { connectDb } from "../db.js";
import { Product } from "../models/Product.js";
import { Plan, type MarketingPlanSlug } from "../models/Plan.js";
import { Feature } from "../models/Feature.js";
import { PlanFeature } from "../models/PlanFeature.js";

const FEATURE_MATRIX: { key: string; label: string; free: boolean; pro: boolean; business: boolean; note?: Partial<Record<MarketingPlanSlug, string>> }[] = [
  // Certificates
  { key: "basic_pdf", label: "PDF certificate generation", free: true, pro: true, business: true },
  { key: "manual_issue", label: "Manual certificate issuing", free: true, pro: true, business: true },
  { key: "lms_integrations", label: "Tutor LMS, LearnDash, LifterLMS, Sensei LMS and WooCommerce", free: true, pro: true, business: true },
  { key: "track_certificates", label: 'Multi-course "track" certificates', free: true, pro: true, business: true },
  // Verification and public pages
  { key: "verification", label: "QR code verification ([cg_verify_certificate])", free: true, pro: true, business: true },
  { key: "revocation", label: "Certificate revocation (shown as revoked on verify)", free: true, pro: true, business: true },
  { key: "linkedin", label: 'LinkedIn "Add to Profile" button', free: true, pro: true, business: true },
  { key: "search_shortcode", label: "Search shortcodes ([student_search], [teacher_search], [school_search])", free: true, pro: true, business: true },
  // Admin tools
  { key: "analytics", label: "Certificate analytics dashboard", free: true, pro: true, business: true },
  { key: "getting_started", label: "Getting Started checklist", free: true, pro: true, business: true },
  { key: "admin_bulk_actions", label: "Bulk edit, bulk email and event filtering on admin lists", free: true, pro: true, business: true },
  { key: "bulk_send_filters", label: "Bulk Send filters (event, import source) + recipient preflight", free: true, pro: true, business: true },
  { key: "events", label: "Events management", free: true, pro: true, business: true },
  { key: "bulk_import", label: "CSV bulk import/export", free: true, pro: true, business: true, note: { free: "Capped" } },
  // Pro
  { key: "bulk_zip", label: "Bulk ZIP download", free: false, pro: true, business: true },
  { key: "email_templates", label: "Email templates", free: false, pro: true, business: true },
  { key: "api_access", label: "REST API", free: false, pro: true, business: true },
  { key: "smtp_tools", label: "SMTP diagnostics", free: false, pro: true, business: true },
  { key: "renewal_reminders", label: "Renewal reminders", free: false, pro: true, business: true },
  { key: "priority_support", label: "Priority support", free: false, pro: true, business: true },
  // Business
  { key: "custom_font_upload", label: "Custom font upload", free: false, pro: false, business: true },
  { key: "unlimited_api", label: "Unlimited API calls", free: false, pro: false, business: true },
  { key: "multisite", label: "Multisite", free: false, pro: false, business: true },
];

const PLANS: Omit<import("../models/Plan.js").PlanDoc, "_id" | "product_id">[] = [
  {
    slug: "free",
    name: "Free",
    billing_type: "free",
    price_monthly: 0,
    price_yearly: 0,
    currency: "usd",
    cert_limit: 100,
    bulk_cap: 250,
    activation_limit: 0,
    cta_label: "Get started free",
    cta_type: "register",
    highlighted: false,
    sort_order: 1,
    status: "active",
  },
  {
    slug: "pro",
    name: "Pro",
    billing_type: "recurring",
    price_monthly: 3.5,
    price_yearly: 35,
    currency: "usd",
    cert_limit: 1000,
    bulk_cap: 0,
    activation_limit: 1,
    cta_label: "Subscribe",
    cta_type: "checkout",
    highlighted: true,
    sort_order: 2,
    status: "active",
  },
  {
    slug: "business",
    name: "Business",
    billing_type: "contact",
    price_monthly: null,
    price_yearly: null,
    price_note: "Contact for pricing",
    currency: "usd",
    cert_limit: 0,
    bulk_cap: 0,
    activation_limit: 5,
    cta_label: "Contact us",
    cta_type: "contact",
    highlighted: false,
    sort_order: 3,
    status: "active",
  },
];

const DT_PLANS: Omit<import("../models/Plan.js").PlanDoc, "_id" | "product_id">[] = [
  {
    slug: "free",
    name: "Free",
    billing_type: "free",
    price_monthly: 0,
    price_yearly: 0,
    currency: "usd",
    cert_limit: 0,
    bulk_cap: 0,
    activation_limit: 0,
    cta_label: "Get started free",
    cta_type: "register",
    highlighted: false,
    sort_order: 1,
    status: "active",
  },
  {
    slug: "paid",
    name: "Paid",
    billing_type: "recurring",
    price_monthly: 2,
    price_yearly: 19,
    currency: "usd",
    cert_limit: 0,
    bulk_cap: 0,
    activation_limit: 1,
    cta_label: "Subscribe",
    cta_type: "checkout",
    highlighted: true,
    sort_order: 2,
    status: "active",
  },
];

// Mirrors LICENSE-PLAN.md §3's Free/Paid comparison table (Dynamic-tags-v4 plugin).
const DT_FEATURE_MATRIX: { key: string; label: string; free: boolean; paid: boolean; note?: Partial<Record<"free" | "paid", string>> }[] = [
  { key: "dt_tag_limit", label: "Dynamic tags", free: true, paid: true, note: { free: "Up to 15", paid: "Unlimited" } },
  { key: "dt_groups", label: "Groups / taxonomy organization", free: true, paid: true },
  { key: "dt_storage", label: "Dual storage (post type + custom table) + migration", free: true, paid: true },
  { key: "dt_conflict_detection", label: "Conflict detection between tag names/shortcodes", free: true, paid: true },
  { key: "dt_import_export", label: "Import/export (JSON, CSV, XML, SQL)", free: true, paid: true },
  { key: "dt_builder_agnostic", label: "Works in any builder (Elementor, Gutenberg, Divi, widgets)", free: true, paid: true },
  { key: "dt_core_placeholders", label: "Post/taxonomy/author/site/URL/date placeholders", free: true, paid: true },
  { key: "dt_meta", label: "{meta:key} (post meta)", free: true, paid: true },
  { key: "dt_acf_scalar", label: "{acf:field} — scalar fields", free: true, paid: true },
  { key: "dt_formatters", label: "Formatters (|upper, |currency, |date, |round, …)", free: true, paid: true },
  { key: "dt_fallback", label: "Fallback syntax {token??default}", free: true, paid: true },
  { key: "dt_conditionals_builtin", label: "Built-in conditionals (user_logged_in, is_mobile, user_role:, …)", free: true, paid: true },
  { key: "dt_shortcodes_core", label: "[dt_group] / [dt_random] / [dt_count] / [dt_list] / [dt]", free: true, paid: true },
  { key: "dt_woocommerce", label: "WooCommerce fields {wc:price|sku|stock_status|categories|…}", free: false, paid: true },
  { key: "dt_acf_arrays", label: "ACF repeater/gallery/relationship ({acf:field.subfield})", free: false, paid: true },
  { key: "dt_meta_extra", label: "{user_meta:key} / {term_meta:key}", free: false, paid: true },
  { key: "dt_loop", label: "[dt_loop] — iterate any array-returning source", free: false, paid: true },
  { key: "dt_conditionals_field", label: "Field-based conditionals ({if:wc:price>50}, =, contains, …)", free: false, paid: true },
  { key: "dt_if_else", label: "[dt_if]/[dt_else] — block-level visibility", free: false, paid: true },
  { key: "dt_template", label: "[dt_template] — per-record rendering", free: false, paid: true },
  { key: "dt_query", label: "{query:...} — query posts as a reusable data source", free: false, paid: true },
  { key: "dt_api", label: "{api:...} — external JSON data source", free: false, paid: true },
  { key: "dt_func", label: "{func:...} — developer function escape hatch", free: false, paid: true },
  { key: "dt_support", label: "Support", free: true, paid: true, note: { free: "Community (GitHub issues)", paid: "Priority email" } },
];

async function seedCertificateGenerator() {
  const product = await Product.findOneAndUpdate(
    { slug: "certificate-generator" },
    { name: "Certificate Generator", slug: "certificate-generator", status: "active" },
    { upsert: true, new: true },
  );

  const planIdBySlug = new Map<MarketingPlanSlug, import("mongoose").Types.ObjectId>();
  for (const plan of PLANS) {
    const doc = await Plan.findOneAndUpdate(
      { product_id: product._id, slug: plan.slug },
      { ...plan, product_id: product._id },
      { upsert: true, new: true },
    );
    planIdBySlug.set(plan.slug, doc._id);
  }

  const featureIdByKey = new Map<string, import("mongoose").Types.ObjectId>();
  for (const [i, f] of FEATURE_MATRIX.entries()) {
    const doc = await Feature.findOneAndUpdate(
      { key: f.key },
      { key: f.key, label: f.label, sort_order: i },
      { upsert: true, new: true },
    );
    featureIdByKey.set(f.key, doc._id);
  }

  // Drop rows for features no longer in the matrix — /api/plans/compare lists
  // every feature that has a PlanFeature row for these plans.
  await PlanFeature.deleteMany({ plan_id: { $in: [...planIdBySlug.values()] }, feature_id: { $nin: [...featureIdByKey.values()] } });

  for (const f of FEATURE_MATRIX) {
    for (const slug of ["free", "pro", "business"] as const) {
      await PlanFeature.findOneAndUpdate(
        { plan_id: planIdBySlug.get(slug), feature_id: featureIdByKey.get(f.key) },
        { enabled: f[slug], note: f.note?.[slug] },
        { upsert: true },
      );
    }
  }

  return { plans: PLANS.length, features: FEATURE_MATRIX.length };
}

async function seedDynamicTags() {
  const product = await Product.findOneAndUpdate(
    { slug: "dynamic-tags" },
    { name: "Dynamic Tags", slug: "dynamic-tags", status: "active" },
    { upsert: true, new: true },
  );

  const planIdBySlug = new Map<MarketingPlanSlug, import("mongoose").Types.ObjectId>();
  for (const plan of DT_PLANS) {
    const doc = await Plan.findOneAndUpdate(
      { product_id: product._id, slug: plan.slug },
      { ...plan, product_id: product._id },
      { upsert: true, new: true },
    );
    planIdBySlug.set(plan.slug, doc._id);
  }

  const featureIdByKey = new Map<string, import("mongoose").Types.ObjectId>();
  for (const [i, f] of DT_FEATURE_MATRIX.entries()) {
    const doc = await Feature.findOneAndUpdate(
      { key: f.key },
      { key: f.key, label: f.label, sort_order: i },
      { upsert: true, new: true },
    );
    featureIdByKey.set(f.key, doc._id);
  }

  for (const f of DT_FEATURE_MATRIX) {
    for (const slug of ["free", "paid"] as const) {
      await PlanFeature.findOneAndUpdate(
        { plan_id: planIdBySlug.get(slug), feature_id: featureIdByKey.get(f.key) },
        { enabled: f[slug], note: f.note?.[slug] },
        { upsert: true },
      );
    }
  }

  return { plans: DT_PLANS.length, features: DT_FEATURE_MATRIX.length };
}

async function main() {
  await connectDb(process.env.MONGODB_URI ?? "mongodb://localhost:27017/certificate-license-platform");

  const cg = await seedCertificateGenerator();
  const dt = await seedDynamicTags();

  console.log(`Seeded 2 products, ${cg.plans + dt.plans} plans, ${cg.features + dt.features} features.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
