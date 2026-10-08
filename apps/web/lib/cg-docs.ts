// Per-topic Certificate Generator docs, served at /docs/certificate-generator/<slug>.
// Source of truth: documentation.md at the repo root — keep the two in sync.
// UI labels are written exactly as they appear in wp-admin.

export interface DocBlock {
  h2: string;
  paragraphs?: string[];
  list?: string[];
  ordered?: boolean;
  code?: string;
  table?: { head: string[]; rows: string[][] };
}

export interface CgDoc {
  slug: string;
  title: string;
  description: string;
  intro: string;
  blocks: DocBlock[];
  feature?: string; // related /certificate-generator/<slug> page
}

export const CG_DOCS: CgDoc[] = [
  {
    slug: "getting-started",
    title: "Getting started with Certificate Generator",
    description: "A 5-step quick start for Certificate Generator: configure SMTP, create a template, add students, send a test email, and bulk send certificates.",
    intro: "This 5-step checklist takes you from a fresh install to your first bulk send. The same checklist is available in wp-admin under Certificate Generator → Documentation → Getting Started.",
    blocks: [
      {
        h2: "Quick start",
        ordered: true,
        list: [
          "Configure SMTP — install the free WP Mail SMTP plugin, set the mailer to your provider (Gmail, Hostinger, SendGrid…), and set From Email to match your authenticated SMTP account.",
          "Create a certificate template — go to Templates, upload your background image, and position the text fields (name, certificate type, date, etc.).",
          "Add students — go to Students and add records manually, or use Bulk Import to upload a CSV with student_name, email, school_name, certificate_type and issue_date.",
          "Send a test email — go to Settings → Email and use Send Test Email to verify delivery.",
          "Bulk send — go to Bulk Send, filter by school or certificate type, and click Send Certificates.",
        ],
      },
      {
        h2: "Automatic issuance from your LMS",
        paragraphs: [
          "If you run Tutor LMS, LearnDash, LifterLMS, Sensei LMS or WooCommerce, certificates can be issued automatically on course or order completion instead of by bulk send.",
        ],
      },
    ],
    feature: "certificate-management-system",
  },
  {
    slug: "installation",
    title: "Installing Certificate Generator",
    description: "How to install and activate the Certificate Generator WordPress plugin, and migrate data from older installs.",
    intro: "Certificate Generator needs WordPress 6.0+ and PHP 8.0+. Activation creates the plugin's own database tables.",
    blocks: [
      {
        h2: "Install and activate",
        ordered: true,
        list: [
          "Download the plugin ZIP from your Tech Love V dashboard (Downloads).",
          "In WordPress, go to Plugins → Add New → Upload Plugin and upload the ZIP — or copy the plugin folder into wp-content/plugins/.",
          "Activate Certificate Generator from the Plugins screen. This creates the custom database tables.",
          "Open Certificate Generator → Documentation → Getting Started and follow the checklist.",
        ],
      },
      {
        h2: "Upgrading from an older version",
        paragraphs: [
          "If you're migrating from an older install that stored certificates as posts, run Certificate Generator → Migration to copy existing data into the new tables.",
          "Plugin updates only replace PHP, JS and CSS files — they never drop or truncate database tables. Take a backup before major updates anyway.",
        ],
      },
      {
        h2: "Activating a license",
        paragraphs: ["The Free plan needs no license key. For Pro or Business, go to Settings → License in the plugin and paste the key you receive after checkout."],
      },
    ],
  },
  {
    slug: "templates",
    title: "Creating certificate templates",
    description: "Create a certificate template in WordPress: upload a background, position Name, Certificate Type, School and Date fields, set fonts, and preview with debug mode.",
    intro: "A template is a background image plus positioned fields. Design the background in any tool (Canva works well), leaving the name area blank, and export it as an image.",
    blocks: [
      {
        h2: "Create a template",
        ordered: true,
        list: [
          "Go to Certificate Generator → Templates → Add New.",
          "Upload your certificate background image (PNG or JPG, A4 landscape recommended).",
          "Use the field position editor to drag Name, Certificate Type, School and Date onto the canvas — up to 15 custom field slots per certificate type.",
          "Set font, size and colour for each field.",
          "Click Preview to get a sample PDF with field boundaries and position markers.",
          "Click Save Template.",
        ],
      },
      {
        h2: "How templates are matched",
        paragraphs: [
          "Each recipient's certificate type is matched against the template name. If no match is found, the default template is used.",
          "Editing a template only affects future PDFs; already-generated certificates are not regenerated.",
        ],
      },
      {
        h2: "Custom fonts",
        paragraphs: ["On the Business plan you can upload a .ttf font (a script font for names, for example) and select it for any field."],
      },
    ],
    feature: "certificate-templates",
  },
  {
    slug: "import-students-csv",
    title: "Importing students, teachers and schools from CSV",
    description: "Bulk import certificate recipients into WordPress from CSV. Required columns, sample files, plan limits and bulk export.",
    intro: "Bulk Import creates student, teacher, school and certificate template records from a CSV file.",
    blocks: [
      {
        h2: "Import a CSV",
        ordered: true,
        list: [
          "Go to Certificate Generator → Bulk Import.",
          "Download the sample CSV to see the required columns.",
          "Fill in your data and upload the file.",
          "Review the import summary.",
        ],
      },
      {
        h2: "Required columns",
        paragraphs: ["Students need these columns. Teachers and schools use the equivalent name field."],
        table: {
          head: ["Column", "Example"],
          rows: [
            ["student_name", "Priya Sharma"],
            ["email", "priya@example.com"],
            ["school_name", "Greenfield Public School"],
            ["certificate_type", "Participation"],
            ["issue_date", "2026-03-15"],
          ],
        },
      },
      {
        h2: "Limits",
        paragraphs: ["The Free plan imports and exports up to 500 students, 500 teachers, 500 schools and 10 templates. Pro and Business have no row caps."],
      },
      {
        h2: "Export",
        paragraphs: ["Bulk Export downloads all records as CSV — useful for backups or moving data between sites."],
      },
    ],
    feature: "bulk-certificate-generation",
  },
  {
    slug: "serial-numbers",
    title: "Certificate serial numbers",
    description: "Configure certificate serial number format (PREFIX-YEAR-SEQ), reset period and padding, and bulk-assign serials to existing records.",
    intro: "Serial numbers are generated automatically when a certificate is created. This feature works the same on Free, Pro and Business.",
    blocks: [
      {
        h2: "Format",
        paragraphs: ["The format is PREFIX-{YEAR}-{SEQ}, for example GEMA-2025-00142. Under Serial Settings you can configure the prefix, whether the year is included, sequence length, an optional suffix, and the reset period."],
      },
      {
        h2: "Assign serials to existing records",
        paragraphs: ["Use Bulk Serials to assign serial numbers to records that don't have one yet."],
      },
    ],
    feature: "certificate-serial-numbers",
  },
  {
    slug: "qr-codes",
    title: "QR codes on certificates",
    description: "How Certificate Generator adds a verification QR code to every certificate PDF automatically.",
    intro: "QR codes are embedded in every certificate automatically during PDF creation. No setup is needed — the QR library ships with the plugin.",
    blocks: [
      {
        h2: "Where the QR code points",
        paragraphs: [
          "Each QR code links to the public verification page on your site (/verify-certificate/), where anyone can confirm the certificate is authentic.",
          "Because the link points to your own site, it only works for other people once the site is publicly reachable.",
        ],
      },
    ],
    feature: "certificate-verification",
  },
  {
    slug: "verification",
    title: "Verifying certificates",
    description: "Public certificate verification by QR code, serial number or email, the [cg_verify_certificate] shortcode, and the /verify/{serial} REST endpoint.",
    intro: "Every certificate's QR code — and the [cg_verify_certificate] shortcode — resolves to a public authenticity check. Verification is not plan-gated.",
    blocks: [
      {
        h2: "Ways to verify",
        list: [
          "Scan the QR code on the certificate — opens /verify-certificate/.",
          "Search by serial number or email on the results page (/result/).",
          "Call the public REST endpoint /verify/{serial} (no API key).",
        ],
      },
      {
        h2: "Add the verification form to a page",
        code: "[cg_verify_certificate]",
        paragraphs: ["Revoked certificates are shown as revoked when verified."],
      },
    ],
    feature: "certificate-verification",
  },
  {
    slug: "events",
    title: "Organising certificates by event",
    description: "Use events in Certificate Generator to filter admin lists and bulk sends by event.",
    intro: "Events keep certificates for different workshops, conferences or graduations separate. Events management is included on every plan.",
    blocks: [
      {
        h2: "Filtering by event",
        list: [
          "Admin lists support filtering by event, together with bulk edit and bulk email.",
          "In Bulk Send, filter by event and import source, then check the recipient preflight before sending.",
        ],
      },
    ],
    feature: "certificate-events",
  },
  {
    slug: "analytics",
    title: "Analytics and email logs",
    description: "Certificate Generator analytics: certificates issued, emails sent, failed and pending, send volume over time, and per-send email logs.",
    intro: "Analytics and Email Logs are included on every plan.",
    blocks: [
      {
        h2: "Analytics",
        paragraphs: ["Certificate Generator → Analytics shows:"],
        list: ["Total certificates issued", "Emails sent / failed / pending", "Send volume over time (chart)", "Breakdown by certificate type and school"],
      },
      {
        h2: "Email Logs",
        paragraphs: [
          "Certificate Generator → Email Logs shows every send attempt: recipient name and email, certificate type, status (sent / failed / pending), timestamp, and the error message on failure. Filter by status, date range or email address.",
          "Logs are retained for 90 days, then cleaned up by a weekly job. Analytics is built from these logs, so it's only as complete as your send history.",
        ],
      },
    ],
    feature: "certificate-analytics",
  },
  {
    slug: "smtp-email-setup",
    title: "Setting up SMTP and email templates",
    description: "Configure WP Mail SMTP for reliable certificate delivery, and customise email templates with placeholders like {name}, {serial_number} and {verify_link}.",
    intro: "The plugin sends through WordPress's wp_mail(). For reliable delivery in production you must configure a real SMTP mailer.",
    blocks: [
      {
        h2: "Configure SMTP",
        ordered: true,
        list: [
          "Install the free WP Mail SMTP plugin.",
          "Go to WP Mail SMTP → Settings.",
          "Set From Email to your authenticated sender address — it must exactly match your SMTP login, or you'll get \"Sender address rejected\" bounces.",
          "Choose your mailer (Other SMTP, Gmail, SendGrid, Mailgun).",
          "Enter host, port, username and password from your provider.",
          "Send a test email to verify.",
        ],
      },
      {
        h2: "Provider examples",
        list: [
          "Hostinger / cPanel: host smtp.hostinger.com, port 587 (TLS) or 465 (SSL), username = full email address.",
          "Gmail: smtp.gmail.com, port 587, with an App Password (not your normal password).",
        ],
      },
      {
        h2: "Email template placeholders",
        paragraphs: ["Configure per-entity templates under Settings → Email. WordPress shortcodes are processed after placeholders, so both can be mixed."],
        table: {
          head: ["Placeholder", "Replaced with"],
          rows: [
            ["{name}", "Recipient's full name"],
            ["{certificate_title}", "Certificate type / title"],
            ["{email}", "Recipient's email address"],
            ["{serial_number}", "Certificate serial number"],
            ["{expires_at}", "Expiry date (or \"Never\")"],
            ["{certificate_count}", "Number of certificates in this send"],
            ["{result_link}", "Link to the online results page"],
            ["{verify_link}", "Link to the verification page"],
            ["{zip_link}", "Download link, used when the ZIP would exceed 25 MB"],
          ],
        },
      },
    ],
  },
  {
    slug: "bulk-send",
    title: "Sending certificates in bulk",
    description: "Send certificates to many recipients at once with Bulk Send: filters, skip-already-sent, background queue, ZIP bundling, rate limits and retries.",
    intro: "Bulk Send emails certificates to many recipients through a background queue, so the page doesn't need to stay open.",
    blocks: [
      {
        h2: "Send certificates",
        ordered: true,
        list: [
          "Go to Certificate Generator → Bulk Send.",
          "Choose the entity type (students, teachers or schools).",
          "Filter by School, Certificate Type, Source (which CSV batch or LMS a record came from), event, or Post Type.",
          "Preview the recipient list.",
          "Leave Skip already sent checked (default) to avoid duplicate sends.",
          "Click Send Certificates.",
        ],
      },
      {
        h2: "Multiple certificates per recipient",
        paragraphs: ["If a recipient has more than one certificate, all are bundled into one ZIP attached to a single email. If the ZIP would exceed 25 MB, a download link is sent instead."],
      },
      {
        h2: "Rate limits and retries",
        paragraphs: [
          "Defaults are 60 emails/hour and 10 emails/minute, configurable under Settings → Rate Limits.",
          "A failed email is retried up to 3 times with exponential backoff, then marked failed in Email Logs. Failed items can be reset from the queue management section.",
          "On the Free plan, up to 250 certificate emails are sent per month; further queued emails send automatically on the 1st, or immediately after upgrading.",
        ],
      },
    ],
    feature: "bulk-certificate-generation",
  },
  {
    slug: "shortcodes",
    title: "Shortcodes",
    description: "Certificate Generator shortcodes: [student_search], [teacher_search], [school_search], [school_bulk_certificate_download] and [cg_verify_certificate].",
    intro: "Drop any of these into a page or post with the block or classic editor, or call do_shortcode() in a template.",
    blocks: [
      {
        h2: "Available shortcodes",
        table: {
          head: ["Shortcode", "Purpose"],
          rows: [
            ["[student_search]", "Search form for a student to look up their own certificates by email."],
            ["[teacher_search]", "Same lookup flow for teachers."],
            ["[school_search]", "Same lookup flow for schools, by school name and place."],
            ["[school_bulk_certificate_download]", "Lets a school download all its certificates as a ZIP."],
            ["[cg_verify_certificate]", "Public certificate verification form."],
          ],
        },
      },
      {
        h2: "Customising search-form text",
        paragraphs: ["The three search shortcodes accept optional attributes. For a sitewide default, use Settings → Shortcode Text. Order: shortcode attribute → sitewide setting → built-in default."],
        code: '[student_search title="Custom Title" subtitle="Custom subtitle" button_text="Find Mine" help_text="Custom help text"]',
      },
    ],
    feature: "student-management",
  },
  {
    slug: "rest-api",
    title: "REST API",
    description: "Certificate Generator REST API (namespace certificate-generator/v1): issue certificates, validate keys, look up certificates by email, and verify serials.",
    intro: "Namespace certificate-generator/v1. Endpoints need a bearer token unless noted. The REST API is available on Pro and Business.",
    blocks: [
      {
        h2: "Endpoints",
        table: {
          head: ["Method", "Route", "Auth", "Notes"],
          rows: [
            ["POST", "/issue-certificate", "Bearer token", "Pro / Business. Generates and emails/zips certificates by student email."],
            ["GET", "/health", "None", "Liveness check."],
            ["POST", "/validate-key", "Bearer token", "Validates an API key."],
            ["GET", "/certificates-by-email", "Bearer token", "Read-only lookup — does not regenerate certificates."],
            ["GET", "/verify/{serial}", "None", "Public serial-number verification."],
          ],
        },
      },
    ],
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Fix common Certificate Generator issues: emails not received, \"queued 0 certificates\", PDFs not generating, ZIPs not attaching.",
    intro: "Most problems come down to SMTP configuration, missing template positions, or data that hasn't been migrated yet.",
    blocks: [
      {
        h2: "Emails not being received",
        ordered: true,
        list: [
          "Check Email Logs for failed entries — the error column shows the exact reason.",
          "Verify SMTP via WP Mail SMTP → Tools → Email Test.",
          "Make sure From Email exactly matches your SMTP login (the most common cause).",
          "Check spam — usually means missing SPF/DKIM records.",
          "For bulk sends, check whether the queue is paused on a rate limit.",
        ],
      },
      {
        h2: "\"Successfully queued 0 certificates\" or \"No certificate records found\"",
        paragraphs: ["The filter matched recipients but there are no rows in the certificate table yet. Run Certificate Generator → Migration (or import via Bulk Import), then retry."],
      },
      {
        h2: "Certificate PDF not generating",
        list: [
          "Make sure the template has all field positions set — a missing position aborts generation.",
          "Confirm the uploads directory is writable.",
          "Enable WP_DEBUG_LOG and check wp-content/debug.log.",
        ],
        code: "define( 'WP_DEBUG', true );\ndefine( 'WP_DEBUG_LOG', true );\ndefine( 'WP_DEBUG_DISPLAY', false );",
      },
      {
        h2: "ZIP not attaching",
        paragraphs: ["ZIPs need PHP's ZipArchive extension and a writable uploads directory. ZIPs over 25 MB are sent as a download link instead of an attachment."],
      },
    ],
  },
  {
    slug: "localwp",
    title: "Running Certificate Generator on LocalWP",
    description: "Build and test a WordPress certificate management system locally with LocalWP, and what changes when you move to a live site.",
    intro: "LocalWP (Local) is a free tool for running WordPress on your own computer. It's a good place to design templates, import test data and try bulk sends before going live.",
    blocks: [
      {
        h2: "Set up",
        ordered: true,
        list: [
          "Create a new site in Local.",
          "Open WP Admin and go to Plugins → Add New → Upload Plugin.",
          "Upload the Certificate Generator ZIP and activate it.",
          "Follow the Getting Started checklist: template, students, test email, bulk send.",
        ],
      },
      {
        h2: "Testing email locally",
        paragraphs: ["Local includes a mail catcher in its Tools tab, so test emails and bulk sends can be inspected without reaching real inboxes. Configure a real SMTP provider once you move to a live server."],
      },
      {
        h2: "What needs a live site",
        paragraphs: [
          "QR codes and verification links point to your site's address. On a local site that address is only reachable from your computer, so other people can't verify certificates until the site is deployed to a public domain.",
          "Generate the certificates you send to real recipients from the live site, so their QR codes link to the public URL.",
        ],
      },
    ],
  },
];

export function getCgDoc(slug: string) {
  return CG_DOCS.find((d) => d.slug === slug);
}
