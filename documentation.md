# Certificate Generator — Full Documentation

[← Back to README](../README.md)

This is the single consolidated reference for the plugin — it merges the in-admin
**Certificate Generator → Documentation** guide (Getting Started / User Guide / Email & Bulk
Send / Troubleshooting / FAQ) with the developer-facing `/doc` references, so everything is
findable from one file. The other `/doc/*.md` files remain the deep-dive for their topic; this
file is the overview + everything a day-to-day admin needs.

## Table of contents

1. [Overview](#overview)
2. [Requirements & soft dependencies](#requirements--soft-dependencies)
3. [Installation](#installation)
4. [Admin menu map](#admin-menu-map)
5. [Getting Started — 5-step quick start](#getting-started--5-step-quick-start)
6. [User Guide](#user-guide)
7. [Email & Bulk Send Guide](#email--bulk-send-guide)
8. [Shortcodes](#shortcodes)
9. [REST API](#rest-api)
10. [Configuration reference](#configuration-reference)
11. [Database schema](#database-schema)
12. [Licensing & plans](#licensing--plans)
13. [Architecture notes](#architecture-notes)
14. [Troubleshooting](#troubleshooting)
15. [FAQ](#faq)
16. [Further reading](#further-reading)

---

## Overview

**Certificate Generator** is a WordPress plugin for managing, generating, and bulk-sending
certificates for students, teachers, and schools — template-based PDF generation, QR-code
verification, serial numbering, bulk CSV import/export, email delivery with a background queue,
and usage analytics.

| | |
|---|---|
| **Version** | 7.0.0 *(plugin folder is versioned `V7.5` — known discrepancy, see [`CHANGELOG.md`](CHANGELOG.md))* |
| **Requires** | WordPress 6.0+, PHP 8.0+ |
| **Tested up to** | WordPress 6.7 |
| **License** | GPL-2.0+ |
| **Author** | [Eshaan Manchanda](https://www.linkedin.com/in/eshaan-manchanda/) |
| **Text domain** | `certificate-generator` |

### Feature list

- **Certificate templates** — upload a background image, drag-position Name/Type/School/Date
  (and other) fields, set font/size/colour per field, per certificate type.
- **PDF generation** via a bundled [FPDF](../lib/fpdf) engine — no TCPDF/mPDF dependency.
- **QR-code verification** — every certificate gets a QR code (bundled PHP QR Code library)
  linking to a public `/verify-certificate/` page.
- **Serial numbers** — auto-generated, configurable format (`PREFIX-{YEAR}-{SEQ}`), with a
  bulk-assignment tool for existing records that don't have one yet.
- **Students / Teachers / Schools management** — manual entry, or bulk CSV import/export.
- **Bulk email sending** — filter by school/certificate type/source, background queue
  processing, automatic ZIP bundling when a recipient has multiple certificates, configurable
  rate limits, retry with exponential backoff.
- **Email logs & analytics** — per-send delivery status, dashboard charts, breakdown by
  certificate type and school, expiration reports.
- **Public verification & search shortcodes** for front-end use (no login required).
- **REST API** for external integrations (issuing certificates, health checks, lookups).
- **Licensing tiers** (Free / Pro / Business) — see [Licensing & plans](#licensing--plans).
- **External sync** with a companion "GEMA" MERN backend service.

## Requirements & soft dependencies

The plugin itself never calls `register_post_type()` — it expects the `students`, `teachers`,
`schools`, and `certificates` custom post types to already be registered elsewhere (a companion
plugin or theme), and conditionally registers [ACF](https://www.advancedcustomfields.com/) field
groups via `acf_add_local_field_group()` if ACF is active.

For production email delivery, the **WP Mail SMTP** plugin is recommended (the plugin also ships
its own SMTP transport as a fallback — see `src/Email/Transport/SmtpTransport.php`).

## Installation

1. Copy the plugin folder to `wp-content/plugins/`.
2. Activate **Certificate Generator** from the WordPress Plugins screen — this creates the
   custom database tables (see [Database schema](#database-schema)).
3. Make sure a source for the `students`/`teachers`/`schools`/`certificates` post types exists,
   and that ACF is active if you rely on the meta-box/field-group editing UI.
4. Open **Certificate Generator → Documentation → Getting Started** in wp-admin and follow the
   5-step checklist below (SMTP → template → students → test email → bulk send).
5. If you're migrating from an older CPT-only install, run **Certificate Generator → Migration**
   to copy existing post data into the new SQL tables (see [Database schema](#database-schema)).

## Admin menu map

Registered under the **Certificate Generator** top-level menu (`cg-dashboard`) in
`certificate-generator.php`, plus a few pages registered by their own modules:

| Menu item | Slug | What it does |
|---|---|---|
| Dashboard | `cg-dashboard` | Landing page |
| Students / Teachers / Schools | `cg-students` etc. | List + Add/Edit records (`src/Admin/Pages/*Page.php`) |
| Templates | `cg-templates` | Certificate template designer (`src/Admin/Pages/TemplatesPage.php`) |
| Bulk Import | `cg-bulk-import` | CSV import for students/teachers/schools/certificate templates |
| Bulk Export | `cg-bulk-export` | CSV export for the same four entities |
| Download Certs | `cg-cert-download` | Admin-side certificate download tool |
| Bulk Send | `certificate-bulk-send` | Filtered bulk email sending with background queue |
| Email Logs | `certificate-email-logs` | Per-send delivery history |
| Analytics | `cg-analytics` | Charts and breakdowns (`includes/Admin/analytics.php`) |
| Serial Settings | `cg-serial-settings` | Serial number format configuration |
| Bulk Serials | (via `includes/Admin/bulk-serial.php`) | Assign serials to existing records missing one |
| Migration | (via `src/Admin/Pages/MigrationPage.php`) | CPT → SQL data migration |
| Documentation | `cg-documentation` | This guide's in-admin counterpart |
| Settings | `certificate_generator_settings` (Settings menu) | General / Templates / Email / **License** / Rate Limits tabs |

## Getting Started — 5-step quick start

1. **Configure SMTP** — install the free **WP Mail SMTP** plugin, set the mailer to your
   provider (Gmail / Hostinger / SendGrid), and set *From Email* to match your authenticated
   SMTP account.
2. **Create a certificate template** — go to **Templates**, upload your background image, and
   position the text fields (name, certificate type, date, etc.).
3. **Add students** — go to **Students** and add records manually, or use **Bulk Import** to
   upload a CSV (required columns: `student_name`, `email`, `school_name`, `certificate_type`,
   `issue_date`).
4. **Send a test email** — go to **Settings → Email** and use *Send Test Email* to verify
   delivery.
5. **Bulk send** — go to **Bulk Send**, filter by school / certificate type, and click
   *Send Certificates*.

## User Guide

### Certificate templates

1. Go to **Certificate Generator → Templates → Add New**.
2. Upload your certificate background image (PNG or JPG, A4 landscape recommended).
3. Use the field position editor to drag Name, Certificate Type, School, and Date fields onto
   the canvas — up to 15 custom field slots per certificate type (`CG_Field_Schema`).
4. Set font, size, and colour for each field.
5. Click **Save Template**.

Each student's certificate type is matched against the template name — if no match is found,
the default template is used. Editing a template only affects *future* PDF generations;
previously generated PDFs are not regenerated automatically.

### Managing Students, Teachers & Schools

- **Manually**: go to **Students / Teachers / Schools → Add New** and fill in Name, Email,
  School, Certificate Type, Issue Date.
- **Bulk import via CSV**: go to **Bulk Import**, download the sample CSV to see the required
  columns, fill in your data, upload, and review the import summary. See
  [Configuration reference](#required-csv-columns) for the exact column list, and
  [Licensing & plans](#licensing--plans) for the Free-plan row caps.
- **Bulk export**: go to **Bulk Export** to download all records as CSV — useful for backups or
  migrating data. Free plan exports are capped the same way as imports.

### Serial numbers

Serial numbers are generated automatically when a certificate is created. Format is configured
under **Serial Settings**:

- Format: `PREFIX-{YEAR}-{SEQ}` — e.g. `GEMA-2025-00142`.
- Prefix, year inclusion, sequence padding, and reset period are all configurable
  (`cg_serial_prefix`, `cg_serial_length`, `cg_serial_suffix`, `cg_serial_reset_period`,
  `cg_serial_include_date`).
- Use **Bulk Serials** to assign serial numbers to existing records that don't have one yet.

This feature is **not plan-gated** — it works identically on Free, Pro, and Business.

### QR codes

QR codes are embedded in every certificate automatically during PDF creation and link to the
public verification page (`/verify-certificate/`) — no manual setup required, the QR library
ships with the plugin.

### Analytics

**Certificate Generator → Analytics** shows:

- Total certificates issued
- Emails sent / failed / pending
- Send volume over time (chart)
- Breakdown by certificate type and school

Data is pulled from the email-logs table, so it's only as complete as your send history. This
feature is **not plan-gated** — it works identically on Free, Pro, and Business.

### Verification

Every certificate's QR code (and the `[cg_verify_certificate]` shortcode) resolves to a public
authenticity check. Visitors can also search by serial number or email on the results page.
This feature is **not plan-gated**.

## Email & Bulk Send Guide

### Setting up SMTP (required for production)

The plugin sends via WordPress's `wp_mail()`. For reliable delivery you must configure a real
SMTP mailer:

1. Install the free **WP Mail SMTP** plugin.
2. Go to **WP Mail SMTP → Settings**.
3. Set *From Email* to your authenticated sender address — it **must exactly match** your SMTP
   account login, or you'll get "Sender address rejected" bounces.
4. Choose your mailer (Other SMTP / Gmail / SendGrid / Mailgun).
5. Enter host, port, username, and password from your provider.
6. Send a test email from WP Mail SMTP to verify.

**Hostinger / cPanel example**: host `smtp.hostinger.com`, port `587` (TLS) or `465` (SSL),
username = full email address.

### Email templates & placeholders

Configure per-entity templates under **Settings → Email**. WordPress shortcodes (e.g.
`[site_name]`) are processed *after* placeholder substitution, so both can be mixed.

| Placeholder | Replaced with |
|---|---|
| `{name}` | Recipient's full name |
| `{certificate_title}` | Certificate type / title |
| `{email}` | Recipient's email address |
| `{serial_number}` | Certificate serial number |
| `{expires_at}` | Expiry date (or "Never") |
| `{certificate_count}` | Number of certificates in this send |
| `{result_link}` | Link to online results page |
| `{verify_link}` | Link to certificate verification page |
| `{zip_link}` | Download link (used when the ZIP attachment would exceed 25 MB) |

### Sending bulk emails

1. Go to **Certificate Generator → Bulk Send**.
2. Filter by *School*, *Certificate Type*, *Source* (which CSV batch / LMS origin a record came
   from), or *Post Type*.
3. Preview the recipient list.
4. Leave *Skip already sent* checked (default) to avoid duplicate sends.
5. Click **Send Certificates** — processing happens via a background queue, so the page doesn't
   need to stay open.

If a recipient has more than one certificate, all are bundled into a single ZIP attached to one
email (or, if the ZIP would exceed 25 MB, a download link is sent instead).

Rate limits (defaults: 60 emails/hour, 10 emails/minute) are configured under
**Settings → Rate Limits** and enforced automatically by the queue processor.

### Email Logs

**Certificate Generator → Email Logs** shows every send attempt: recipient name & email,
certificate type, status (`sent` / `failed` / `pending`), timestamp, and error message on
failure. Filter by status, date range, or email address. Logs are retained 90 days, then
auto-cleaned by a weekly cron job.

## Shortcodes

Registered in `includes/Services/certificate-search.php`, `includes/Services/bulk-download.php`,
and `includes/Public/verification.php`.

| Shortcode | Purpose |
|---|---|
| `[student_search]` | Front-end search form for a student to look up their own certificate(s) by email. |
| `[teacher_search]` | Same lookup flow for teachers. |
| `[school_search]` | Same lookup flow for schools (by school name and place). |
| `[school_bulk_certificate_download]` | Lets a school download all of its certificates in bulk (ZIP) from the front end. |
| `[cg_verify_certificate]` | Public certificate authenticity verification form — reachable via a certificate's QR code (`/verify-certificate/`); visitors can also search by serial number or email on the results page (`/result/`). |

### Customizing search-form text

The three search shortcodes accept optional attributes to override title, subtitle, button
text, and help text on a specific page:

```
[student_search title="Custom Title" subtitle="Custom subtitle" button_text="Find Mine" help_text="Custom help text"]
```

To set a sitewide default instead of editing every page, use
**Settings → Shortcode Text**. Resolution order: shortcode attribute → sitewide setting →
built-in default.

Drop any shortcode into a page/post via the block or classic editor, or via `do_shortcode()` in
a template.

## REST API

Namespace `certificate-generator/v1`, defined in `includes/API/endpoints.php`. Requires a bearer
token (`certificate_generator_api_key` option) unless noted.

| Method | Route | Auth | Notes |
|---|---|---|---|
| `POST` | `/issue-certificate` | Bearer token | Gated to **Pro / Business**. Generates and emails/zips certificates by student email. |
| `GET` | `/health` | None | Liveness check. |
| `POST` | `/validate-key` | Bearer token | Validates an API key. |
| `GET` | `/certificates-by-email` | Bearer token | Read-only lookup — does not regenerate certificates. |

**`/verify/{serial}`** — public serial-number verification. Registered in
`src/Services/SerialNumberService.php` (the legacy duplicate in
`includes/Services/serial-generator.php` was removed — see [`CHANGELOG.md`](CHANGELOG.md)).

**`cg/v1/verify-license`** — admin-only, rate-limited (5/min) license verification, implemented
in `includes/Public/verification.php` and referenced by `includes/API/payment-endpoints.php`.
Despite the file name, this is a *license* check, not the public certificate-verification
shortcode.

`src/API/Controller.php` provides a generic base REST controller used by newer `src/` endpoints.

Full detail: [`REST-API.md`](REST-API.md).

## Configuration reference

Canonical settings are owned by `src/Services/SettingsService.php` (option prefix `cg_`), with
migration from the legacy serialized option `certificate_generator_settings_email`. Main UI:
**Certificate Generator → Settings** (General / Templates / Email / License / Rate Limits tabs).

### Email / SMTP

| Option | Purpose |
|---|---|
| `cg_email_transport` | `wp_mail` or `smtp` |
| `cg_email_from_name` / `cg_email_from_email` | Sender identity |
| `cg_email_subject` / `cg_email_body` | HTML template with placeholders |
| `cg_smtp_host` / `cg_smtp_port` / `cg_smtp_username` / `cg_smtp_password` (encrypted) / `cg_smtp_encryption` | SMTP connection details |

### Serial numbers

| Option | Purpose |
|---|---|
| `cg_serial_prefix` | Prefix string, e.g. `GEMA` |
| `cg_serial_length` | Sequence digit padding |
| `cg_serial_suffix` | Optional suffix |
| `cg_serial_reset_period` | When the sequence counter resets |
| `cg_serial_include_date` | Whether to embed the year, e.g. `GEMA-2025-00142` |

### Licensing

| Option | Purpose |
|---|---|
| `cg_plan` | `free` \| `pro` \| `business` |
| `cg_license_key` / `cg_license_expiry` | License credentials |
| `cg_monthly_usage` / `cg_usage_month` | Usage-limit tracking |
| `cg_license_server_url` | External license validation endpoint |

See [Licensing & plans](#licensing--plans) below for the full plan matrix.

### External integration (GEMA API)

| Option | Purpose |
|---|---|
| `cg_gema_api_url` / `cg_gema_api_key` | Bearer-token client config for `src/Integrations/GemaAPI.php`, syncing students/teachers/schools/certificates with a companion GEMA MERN backend |

### Misc

| Option | Purpose |
|---|---|
| `certificate_generator_version` | Installed version tracking |
| `certificate_generator_settings` | Installation mode, max memory usage, etc. |
| `certificate_generator_api_key` / `certificate_generator_api_key_enabled` | REST API key + enable flag |
| `cg_keep_data_on_uninstall` | If false, uninstall drops all custom tables and deletes plugin options |
| `cg_extra_fields_{cert_type_key}` | Per-certificate-type custom field registry (max 15 extra slots) |

### Required CSV columns

**Bulk Import** requires: `student_name`, `email`, `school_name`, `certificate_type`,
`issue_date` (teachers/schools use the equivalent name field). Sample files live in
`assets/data/` (`students.csv`, `teacher.csv`, `school.csv`, `certificates.csv`).

Free-plan row caps for bulk import/export — see [Licensing & plans](#licensing--plans).

### Uninstall

Gated by `cg_keep_data_on_uninstall`. If disabled: drops both legacy and `wp_cg_*` tables,
deletes ~25 named options, and clears all scheduled cron hooks.

## Database schema

Schema owner: `src/Database/CustomTables.php` (tables created via `dbDelta`). Legacy tables are
created directly in the activation hook in `certificate-generator.php`.

### Modern schema (v7+), prefix `wp_cg_`

| Table | Purpose |
|---|---|
| `wp_cg_students` | Student records — linked to `wp_posts` via `wp_post_id`, `extra_fields` JSON column |
| `wp_cg_teachers` | Teacher records — same shape as students |
| `wp_cg_schools` | School records — same shape as students |
| `wp_cg_certificate_templates` | Template config: orientation, font, QR position/size, serial display, expiration rules, `field_config` JSON, status |
| `wp_cg_certificates` | Issued certificates: recipient info, serial number, `pdf_path`/`pdf_url`, `certificate_data` JSON, status |
| `wp_cg_email_logs` | Per-send delivery records — feeds Email Logs and Analytics |
| `wp_cg_email_queue` | Background email queue — feeds the bulk-send processor |
| `wp_cg_student_certificates` / `wp_cg_teacher_certificates` | Join tables: students/teachers ↔ certificates |
| `wp_cg_settings` | Structured settings storage |
| `wp_cg_migrations` | Tracks which versioned migrations have run |
| `wp_cg_lms_course_map` | Course → certificate-template mapping for LMS integrations (Tutor LMS) |

`wp_cg_students`/`teachers`/`schools` also carry an `import_source` column — the uploaded CSV
filename from Bulk Import, or a fixed tag like `tutor_lms` for LMS-auto-created records. Powers
the Bulk Send "Source" filter.

### Legacy tables (kept for back-compat)

| Table | Purpose |
|---|---|
| `wp_certificate_generator` | Original certificate records table |
| `wp_cert_email_logs` | Original email log table — what the in-admin Analytics reads |
| `wp_cert_email_queue` | Original email queue table |

### Migration path (CPT → custom SQL tables)

The v7 rewrite moved primary certificate storage from `wp_posts`/`wp_postmeta` (on the
`students`/`teachers`/`schools`/`certificates` CPTs) into the custom `wp_cg_*` tables. CPTs are
kept only for admin-UI editing (meta boxes/ACF) and back-compat linkage via `wp_post_id`.

Run the migration from **Certificate Generator → Migration**. If Bulk Send reports "Successfully
queued 0 certificates" or "No certificate records found", the migration usually hasn't been run
yet for existing CPT data.

Full detail: [`DATABASE.md`](DATABASE.md).

## Licensing & plans

Full breakdown (pricing, exact caps, license-key format): [`PLAN-COMPARISON.md`](PLAN-COMPARISON.md).

| Plan | Price | Monthly certs | Bulk import/export cap | Notable extras |
|---|---|---|---|---|
| **Free** | $0 | 100/mo | 250 students/teachers/schools, 6 templates | Verification, Analytics, Serial Numbers, Search shortcode all included |
| **Pro** | $3.5/mo or $35/yr | 1,000/mo | Unlimited | + Bulk ZIP download, Email templates, REST API, SMTP diagnostics, Priority support |
| **Business** | Full access — [contact us](https://eshaanportfolio.vercel.app/contact) | Unlimited | Unlimited | + 19,000+ font library, Unlimited API calls, Multisite support |

Managed by `CG_License_Manager` (`includes/Core/license-manager.php`) — a self-contained
singleton with no external payment processor wired in yet (`activate_license()` either calls a
configurable remote license server, or falls back to a local `PRO-`/`BIZ-` key-prefix check for
development). The License tab (**Settings → License**) renders the live plan comparison table
from `CG_License_Manager::get_plan_features()`.

## Architecture notes

Full detail: [`ARCHITECTURE.md`](ARCHITECTURE.md).

- **Dual codebase**: the plugin is mid-migration from a procedural `includes/` codebase to a
  namespaced `CertificateGenerator\` OOP architecture in `src/`. Which implementation actually
  runs for PDF/ZIP/data-access is controlled by feature flags in `src/Core/Config.php`
  (`CG_USE_NEW_PDF`, `CG_USE_NEW_ZIP`, `CG_USE_REPOSITORIES`, `CG_USE_DTO`, `CG_USE_EVENTS`).
- **No Composer required** — `certificate-generator.php` falls back to a hand-rolled
  `spl_autoload_register` mapping `CertificateGenerator\Foo\Bar` → `src/Foo/Bar.php`.
- **Bundled libraries** (no package manager): `lib/fpdf/` (PDF rendering) and `lib/phpqrcode/`
  (QR image generation).
- Key files for new contributors: `certificate-generator.php` (bootstrap), `src/Core/Plugin.php`
  (new-arch entry point), `src/Core/Config.php` (feature flags),
  `includes/Services/certificate-search.php` (~3,500 lines — PDF rendering pipeline + 3 search
  shortcodes), `src/Database/CustomTables.php` (schema), `includes/Core/post-types.php`
  (~2,500 lines — meta boxes/ACF/save handlers), `includes/Core/license-manager.php` (plan
  gating), `includes/Admin/settings.php` (~2,800 lines — main settings UI).

## Troubleshooting

### Emails not being received

1. Check **Email Logs** for `failed` entries — the error column shows the exact reason.
2. Verify SMTP config via WP Mail SMTP → Tools → Email Test.
3. **From Email mismatch** is the most common cause — it must exactly match your SMTP login.
4. Check spam folder — usually means missing SPF/DKIM records.
5. If sending in bulk, check whether the queue is paused on a rate limit (Email Logs error
   containing "rate limit").

### "Successfully queued 0 certificates"

The selected filter matched recipients but no rows exist yet in the certificate table.

1. Go to **Certificate Generator → Migration** and run the data migration.
2. Retry the bulk send.

Check record count directly: `SELECT COUNT(*), SUM(email='') FROM wp_certificate_generator;` —
if the email count is high, use the email backfill AJAX action.

### Certificate PDF not generating

1. Make sure the template has **all field positions set** (X/Y for every visible field) — a
   missing position aborts generation.
2. Confirm the WordPress uploads directory is writable.
3. Confirm `lib/fpdf/fpdf.php` is present (bundled with the plugin).
4. Enable `WP_DEBUG` / `WP_DEBUG_LOG` in `wp-config.php` and check `wp-content/debug.log` for
   FPDF errors.

### ZIP file not attaching / download link missing

ZIPs are created when a recipient has more than one certificate. Requires PHP's `ZipArchive`
extension and a writable uploads directory. If the ZIP exceeds 25 MB, a download link is sent
in the email body instead of an attachment.

### Bulk send shows "No certificate records found"

The custom table has no rows for the filtered recipients — run the Migration page, or import via
Bulk Import (which populates the table directly).

### Debug mode

```php
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );
```

Check `wp-content/debug.log` after triggering a send — lines prefixed `[CG Email]` (and similar
`Certificate Generator:` prefixes throughout `includes/`) are from this plugin.

## FAQ

**Can I send certificates to teachers and schools too, not just students?**
Yes — the bulk send page lets you choose the entity type before filtering. Each entity type has
its own email template under Settings → Email.

**Will re-sending skip students who already received their certificate?**
Yes — "Skip already sent" (checked by default) checks the email log and skips recipients with a
`sent` entry for their certificate ID.

**Can I use a Gmail account to send emails?**
Yes, but Gmail requires an App Password. In WP Mail SMTP: choose Gmail as mailer, use
`smtp.gmail.com`, port 587, and your App Password.

**How do I change the certificate PDF design?**
Edit the template in Templates — upload a new background and reposition fields. Future PDFs use
the new design; already-generated PDFs are unchanged.

**What happens if an email fails to send?**
The queue retries up to 3 times with exponential backoff, then marks the item `failed` and logs
the error in Email Logs. Failed items can be reset from the queue management section.

**How long are email logs kept?**
90 days, auto-cleaned weekly (`certificate_generator_cleanup_email_logs()` in
`includes/Email/log.php`).

**Can students verify their certificate online?**
Yes — every certificate's QR code links to `/verify-certificate/`; visitors can also search by
serial number or email on `/result/`.

**Is the plugin multisite compatible?**
Partially — designed for single-site use. Network activation requires the Business plan (see
[Licensing & plans](#licensing--plans)); Free/Pro network-activated installs track usage
per-site independently.

**How do I back up all certificate data?**
Use Bulk Export (CSV), or include the custom tables in a full database backup.

**How do I update the plugin without losing data?**
Plugin updates only replace PHP/JS/CSS files — they never drop or truncate database tables.
Always take a backup before major updates regardless.

## Further reading

| Doc | Covers |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Dual codebase, directory structure, feature flags, key files |
| [`DATABASE.md`](DATABASE.md) | Full schema, legacy tables, migration path |
| [`REST-API.md`](REST-API.md) | REST endpoints, auth, plan gating |
| [`SHORTCODES.md`](SHORTCODES.md) | Front-end shortcodes and usage |
| [`CONFIGURATION.md`](CONFIGURATION.md) | Settings/options reference, uninstall behavior |
| [`PLAN-COMPARISON.md`](PLAN-COMPARISON.md) | Full pricing, plan feature matrix, bulk import/export caps |
| [`TESTING.md`](TESTING.md) | How to run PHPUnit, static analysis, Test Center, Playwright E2E |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |
| [`ROADMAP-V8.md`](ROADMAP-V8.md) | v8 roadmap: LMS integration, Bulk Send source filter |
| [`COMPETITOR-ANALYSIS.md`](COMPETITOR-ANALYSIS.md) | Pricing comparison vs competitors, feature gap list |
