// Feature landing pages for Certificate Generator, served at
// /certificate-generator/<slug>. Every claim here must be backed by
// documentation.md, marketing-site/content.json or lib/plans.ts — these pages
// are what search engines and AI answers quote, so no aspirational features.

export interface FeatureSection {
  h2: string;
  paragraphs: string[];
  screenshot?: string; // file in public/marketing/
}

export interface CgFeature {
  slug: string;
  title: string; // <title>, gets " | Tech Love V" appended
  description: string; // meta description
  h1: string;
  answer: string; // first paragraph: a direct, quotable answer to the page's question
  sections: FeatureSection[];
  steps?: { heading: string; items: string[] };
  docs: { slug: string; label: string }[]; // /docs/certificate-generator/<slug>
  related: string[]; // other feature slugs
}

export const CG_FEATURES: CgFeature[] = [
  {
    slug: "certificate-management-system",
    title: "Certificate Management System for WordPress",
    description:
      "Certificate Generator is a certificate management system for WordPress: manage students, teachers and schools, design templates, issue PDFs in bulk, and verify certificates by QR code or serial number.",
    h1: "A certificate management system that runs inside WordPress",
    answer:
      "A certificate management system keeps the whole certificate lifecycle in one place: recipient records, certificate designs, issuing, delivery, and later verification. Certificate Generator does all of this inside your own WordPress site — records, templates, PDF generation, email delivery, QR verification and analytics — with no external PDF service or per-certificate fees.",
    sections: [
      {
        h2: "Everything in one admin menu",
        paragraphs: [
          "The plugin adds a Certificate Generator menu to wp-admin with Dashboard, Students, Teachers, Schools, Templates, Bulk Import, Bulk Export, Bulk Send, Email Logs, Analytics and Serial Settings pages.",
          "Students, teachers and schools are separate record types, each with its own email template, so one install can serve a whole school network or training organisation.",
        ],
        screenshot: "hero-dashboard.png",
      },
      {
        h2: "The certificate lifecycle",
        paragraphs: [
          "1. Import recipients from CSV or create them automatically from your LMS. 2. Design a template on top of your own background image. 3. Generate PDF certificates, each with a unique serial number and QR code. 4. Email them in bulk through a background queue. 5. Let anyone verify authenticity on a public page.",
          "Certificates can be organised by event and by import source, and revoked certificates show as revoked when someone verifies them.",
        ],
      },
      {
        h2: "Self-hosted by design",
        paragraphs: [
          "PDF rendering (bundled FPDF engine), QR generation (bundled PHP QR Code library) and font embedding all happen on your own server. Your recipient data stays in your WordPress database, in the plugin's own tables.",
        ],
      },
    ],
    docs: [
      { slug: "getting-started", label: "Getting started" },
      { slug: "installation", label: "Installation" },
    ],
    related: ["bulk-certificate-generation", "certificate-verification", "certificate-templates", "lms-certificate-automation"],
  },
  {
    slug: "bulk-certificate-generation",
    title: "Bulk Certificate Generation from CSV in WordPress",
    description:
      "Generate and email certificates in bulk from a CSV file in WordPress. Background queue, retry with backoff, automatic ZIP bundling and skip-already-sent protection.",
    h1: "Bulk certificate generation from CSV",
    answer:
      "Bulk certificate generation means creating personalised certificates for many recipients from one dataset. With Certificate Generator you upload a CSV of students, teachers or schools, then send everyone their PDF certificate in one action — a background queue handles delivery, so the browser tab never has to stay open.",
    sections: [
      {
        h2: "Import recipients from CSV",
        paragraphs: [
          "Go to Bulk Import, download the sample CSV, fill it in and upload it. Student imports need the columns student_name, email, school_name, certificate_type and issue_date; teachers and schools use the equivalent name field.",
          "The Free plan imports and exports up to 500 students, 500 teachers and 500 schools; Pro and Business are unlimited. Bulk Export downloads the same records as CSV for backups.",
        ],
      },
      {
        h2: "Send hundreds of certificates without timeouts",
        paragraphs: [
          "Bulk Send lets you filter recipients by school, certificate type, event or import source, preview the list, then click Send Certificates. Sending runs on a background queue with configurable rate limits (defaults: 60 emails/hour, 10/minute).",
          "Failed sends retry up to 3 times with exponential backoff before being marked failed in Email Logs. \"Skip already sent\" is on by default, so re-running a send never emails the same certificate twice.",
        ],
        screenshot: "bulk-send-queue.png",
      },
      {
        h2: "One email per recipient, even with several certificates",
        paragraphs: [
          "When a recipient has more than one certificate, they're bundled into a single ZIP attached to one email. If the ZIP would exceed 25 MB, a download link is sent instead.",
        ],
      },
    ],
    steps: {
      heading: "How to send certificates in bulk",
      items: [
        "Go to Certificate Generator → Bulk Import and upload your CSV.",
        "Go to Certificate Generator → Bulk Send.",
        "Filter by School, Certificate Type, Source or event.",
        "Preview the recipient list and leave Skip already sent checked.",
        "Click Send Certificates.",
      ],
    },
    docs: [
      { slug: "import-students-csv", label: "Import students from CSV" },
      { slug: "bulk-send", label: "Bulk send guide" },
      { slug: "smtp-email-setup", label: "SMTP setup" },
    ],
    related: ["student-management", "certificate-templates", "certificate-events"],
  },
  {
    slug: "certificate-verification",
    title: "Certificate Verification with QR Codes & Serial Numbers",
    description:
      "Every certificate gets a QR code linking to a public verification page. Anyone can confirm authenticity by QR scan, serial number or email — no login, on every plan including Free.",
    h1: "Online certificate verification by QR code and serial number",
    answer:
      "Certificate Generator embeds a QR code in every certificate PDF. Scanning it opens a public verification page on your own site that confirms the certificate is authentic. Visitors can also search by serial number or email. Verification needs no login and is included on every plan, including Free.",
    sections: [
      {
        h2: "QR codes are added automatically",
        paragraphs: [
          "The QR code is generated during PDF creation by a library bundled with the plugin — there is nothing to configure. It links to your site's /verify-certificate/ page.",
        ],
        screenshot: "verification-page.png",
      },
      {
        h2: "Verify by serial number or email",
        paragraphs: [
          "Each certificate has a unique serial number in the format PREFIX-{YEAR}-{SEQ} (for example GEMA-2025-00142). On the results page, visitors can look a certificate up by serial number or by email address.",
          "Developers can also verify a serial through the public REST endpoint /verify/{serial}, which needs no API key.",
        ],
      },
      {
        h2: "Add a verification form anywhere",
        paragraphs: [
          "The [cg_verify_certificate] shortcode places the verification form on any page or post. Revoked certificates are shown as revoked when checked.",
          "Because verification happens on your website, it must be publicly reachable for other people to verify certificates — a local development site can generate QR codes, but outsiders can't open the links.",
        ],
      },
    ],
    docs: [
      { slug: "verification", label: "Verification" },
      { slug: "qr-codes", label: "QR codes" },
      { slug: "serial-numbers", label: "Serial numbers" },
    ],
    related: ["certificate-serial-numbers", "student-management", "certificate-management-system"],
  },
  {
    slug: "certificate-templates",
    title: "Certificate Templates & Drag-and-Drop Designer for WordPress",
    description:
      "Design certificate templates in WordPress: upload any background image, drag Name, Type, School and Date fields into place, add up to 15 custom fields, and preview with debug markers.",
    h1: "Certificate templates with a drag-and-drop designer",
    answer:
      "A certificate template in Certificate Generator is a background image plus positioned text fields. You design the background anywhere (Canva works well), upload it, and drag fields such as Name, Certificate Type, School and Date onto the canvas. Each recipient's certificate type picks the matching template automatically.",
    sections: [
      {
        h2: "Position every field visually",
        paragraphs: [
          "The field position editor shows a live canvas with zoom and grid snapping. Place the standard fields plus up to 15 custom fields per certificate type, and set font, size and colour per field. Image-type fields support signatures and seals.",
        ],
        screenshot: "template-editor-field-mapping.png",
      },
      {
        h2: "Preview before you issue",
        paragraphs: [
          "Click Preview to get a sample PDF with field boundaries and position markers drawn on it, so you can line everything up before any certificate goes out.",
        ],
        screenshot: "preview-debug-mode.png",
      },
      {
        h2: "Templates, types and fonts",
        paragraphs: [
          "Each recipient's certificate type is matched against the template name; if there's no match, the default template is used. Editing a template only affects future PDFs — certificates already generated are not changed.",
          "Business plan customers can upload their own .ttf fonts and select them for any field.",
        ],
      },
    ],
    steps: {
      heading: "Create a template",
      items: [
        "Go to Certificate Generator → Templates → Add New.",
        "Upload your background image (PNG or JPG, A4 landscape recommended).",
        "Drag Name, Certificate Type, School and Date onto the canvas.",
        "Set font, size and colour for each field.",
        "Click Preview to check alignment, then Save Template.",
      ],
    },
    docs: [{ slug: "templates", label: "Certificate templates" }],
    related: ["bulk-certificate-generation", "certificate-serial-numbers"],
  },
  {
    slug: "certificate-serial-numbers",
    title: "Certificate Serial Numbers in WordPress",
    description:
      "Give every certificate a unique, configurable serial number (PREFIX-YEAR-SEQ). Bulk-assign serials to existing records and verify any certificate by its serial. Included on every plan.",
    h1: "Unique serial numbers on every certificate",
    answer:
      "Certificate Generator assigns a unique serial number to each certificate when it's created, using a configurable format such as PREFIX-{YEAR}-{SEQ} (for example GEMA-2025-00142). The serial is printed on the certificate and can be used to verify it online. Serial numbers work the same on Free, Pro and Business.",
    sections: [
      {
        h2: "Configure the format",
        paragraphs: [
          "Under Serial Settings you control the prefix, whether the year is included, sequence padding, an optional suffix, and when the sequence resets.",
        ],
        screenshot: "final-certificate-pdf.png",
      },
      {
        h2: "Backfill existing records",
        paragraphs: [
          "Use Bulk Serials to assign serial numbers to existing records that don't have one yet — useful after importing historic certificates.",
        ],
      },
      {
        h2: "Use serials for verification",
        paragraphs: [
          "Anyone can enter a serial number on the public results page to confirm a certificate is genuine, and the {serial_number} placeholder can be included in certificate emails.",
        ],
      },
    ],
    docs: [{ slug: "serial-numbers", label: "Serial numbers" }],
    related: ["certificate-verification", "certificate-templates"],
  },
  {
    slug: "student-management",
    title: "Student, Teacher & School Records for Certificates",
    description:
      "Manage students, teachers and schools for certificate issuing in WordPress — add manually or import from CSV, and let recipients look up their own certificates with search shortcodes.",
    h1: "Manage students, teachers and schools in one place",
    answer:
      "Certificate Generator stores three kinds of recipients — students, teachers and schools — each with name, email, school, certificate type and issue date. You can add records by hand, import them from CSV, or have them created automatically from your LMS, and recipients can find their own certificates on the front end.",
    sections: [
      {
        h2: "Add records your way",
        paragraphs: [
          "Go to Students, Teachers or Schools → Add New to create a record manually, or use Bulk Import to upload many at once. Admin lists support bulk edit, bulk email and filtering by event.",
        ],
      },
      {
        h2: "Self-serve certificate lookup",
        paragraphs: [
          "Drop [student_search], [teacher_search] or [school_search] onto any page and recipients can look up their certificates by email (schools by name and place). Results include an Add to LinkedIn button.",
          "[school_bulk_certificate_download] lets a school download all of its certificates as a ZIP from the front end.",
        ],
        screenshot: "search-shortcode-frontend.png",
      },
    ],
    docs: [
      { slug: "import-students-csv", label: "Import students from CSV" },
      { slug: "shortcodes", label: "Shortcodes" },
    ],
    related: ["bulk-certificate-generation", "certificate-events"],
  },
  {
    slug: "certificate-events",
    title: "Organise Certificates by Event in WordPress",
    description:
      "Group certificate recipients by event in WordPress, filter admin lists and bulk sends by event, and issue certificates for each workshop, conference or graduation separately.",
    h1: "Organise certificates by event",
    answer:
      "Certificate Generator includes events management, so certificates for different workshops, conferences, competitions or graduations stay separate. Recipients can be filtered by event in the admin lists and in Bulk Send, which makes it easy to send one event's certificates without touching another's. Events are available on every plan.",
    sections: [
      {
        h2: "Filter everything by event",
        paragraphs: [
          "Admin lists support event filtering alongside bulk edit and bulk email. In Bulk Send, the event and import-source filters narrow the recipient list, and a recipient preflight shows exactly who will receive a certificate before you send.",
        ],
      },
      {
        h2: "Works with the rest of the workflow",
        paragraphs: [
          "Event recipients use the same templates, serial numbers, QR verification and email logs as every other certificate.",
        ],
      },
    ],
    docs: [{ slug: "bulk-send", label: "Bulk send guide" }],
    related: ["bulk-certificate-generation", "student-management"],
  },
  {
    slug: "certificate-analytics",
    title: "Certificate Analytics & Email Delivery Logs for WordPress",
    description:
      "Track certificates issued, emails sent, failed and pending, send volume over time, and breakdowns by certificate type and school — included on every Certificate Generator plan.",
    h1: "Certificate analytics and delivery logs",
    answer:
      "Certificate Generator's Analytics page shows total certificates issued, emails sent, failed and pending, send volume over time, and breakdowns by certificate type and school. Email Logs record every send attempt with its status and error message. Analytics is included on every plan.",
    sections: [
      {
        h2: "The Analytics dashboard",
        paragraphs: [
          "Go to Certificate Generator → Analytics for charts and breakdowns, plus expiration reports. Data comes from the email-logs table, so it reflects your send history.",
        ],
        screenshot: "analytics-dashboard.png",
      },
      {
        h2: "Email Logs",
        paragraphs: [
          "Email Logs list recipient, certificate type, status (sent, failed or pending), timestamp and the exact error on failure. Filter by status, date range or email. Logs are kept for 90 days and cleaned up weekly.",
        ],
      },
    ],
    docs: [{ slug: "analytics", label: "Analytics & email logs" }],
    related: ["bulk-certificate-generation", "certificate-management-system"],
  },
  {
    slug: "lms-certificate-automation",
    title: "Automatic Certificates for Tutor LMS, LearnDash, LifterLMS, Sensei & WooCommerce",
    description:
      "Issue certificates automatically when a learner completes a course in Tutor LMS, LearnDash, LifterLMS or Sensei, or when a WooCommerce order completes — including multi-course track certificates.",
    h1: "Issue certificates automatically from your LMS or store",
    answer:
      "Certificate Generator connects to Tutor LMS, LearnDash, LifterLMS, Sensei LMS and WooCommerce. When a learner completes a course — or a WooCommerce order completes — the certificate is issued automatically, so nobody has to generate it by hand. LMS integrations are included on the Free plan.",
    sections: [
      {
        h2: "Supported platforms",
        paragraphs: [
          "Tutor LMS, LearnDash, LifterLMS and Sensei LMS course completion, plus WooCommerce order completion. Records created this way are tagged with their source, so Bulk Send can filter by where a recipient came from.",
        ],
        screenshot: "lms-integration-settings.png",
      },
      {
        h2: "Track certificates across several courses",
        paragraphs: [
          "Multi-course \"track\" certificates are issued only after a learner has finished every course in the track — useful for programmes and learning paths.",
        ],
      },
    ],
    docs: [{ slug: "getting-started", label: "Getting started" }],
    related: ["certificate-templates", "certificate-verification"],
  },
];

// content.json feature id → feature page, for "Learn more" links on the product landing page.
export const CG_FEATURE_LINKS: Record<string, string> = {
  templates: "/certificate-generator/certificate-templates",
  "qr-verification": "/certificate-generator/certificate-verification",
  "auto-issuance": "/certificate-generator/lms-certificate-automation",
  "bulk-tools": "/certificate-generator/bulk-certificate-generation",
  analytics: "/certificate-generator/certificate-analytics",
  "public-search": "/certificate-generator/student-management",
};

export function getCgFeature(slug: string) {
  return CG_FEATURES.find((f) => f.slug === slug);
}
