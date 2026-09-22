# Certificate Generator — Plan Comparison

Source of truth: `includes/Core/license-manager.php` (`CG_License_Manager::get_plan_features()`,
`LIMITS`, `FREE_BULK_LIMITS`). This file is a human-readable mirror of that data — if you change
the code, update this doc too.

## Pricing

| Plan         | Price          | How to get it |
|--------------|----------------|---------------|
| **Free**     | $0             | Default on activation — no license key needed |
| **Pro**      | **$3.5/month or $35/year** | License key starting `PRO-`, activated on the License tab |
| **Business** | Full access — contact for pricing | [Contact us](https://eshaanportfolio.vercel.app/contact) — license key starting `BIZ-` |

Upgrade / pricing page: `https://eshaanportfolio.vercel.app/` (falls back to
`{license_server}/pricing` when a remote license server is configured).

## Monthly certificate generation limit

| Plan     | Certificates / month |
|----------|-----------------------|
| Free     | 100 |
| Pro      | 1,000 |
| Business | Unlimited |

Resets automatically on the 1st of each month. Usage is tracked in the `cg_monthly_usage` option
and shown as a meter on the License tab.

## Bulk import / export row caps

Introduced so Free users can use bulk CSV import/export, just with a ceiling. Pro and Business
are unlimited for all of these.

| Entity                  | Free plan cap |
|--------------------------|--------------|
| Students                 | 250 |
| Teachers                 | 250 |
| Schools                  | 250 |
| Certificate templates    | 6 |

Behavior:
- **Import**: once the existing row count + new rows would exceed the cap, the import stops at
  the cap and reports how many rows were skipped ("Free plan limit reached — upgrade to Pro for
  unlimited import").
- **Export**: the CSV is capped to the first N rows (`ORDER BY id ASC LIMIT n`) and the export
  page shows a notice of the cap before downloading.

## Full feature matrix

✔ = included, — = not included.

| Feature | Free | Pro | Business |
|---|:---:|:---:|:---:|
| Basic PDF Generation | ✔ | ✔ | ✔ |
| Manual Certificate Issue | ✔ | ✔ | ✔ |
| Search Shortcode (`[teacher_search]`, `[school_search]`, `[student_search]`) | ✔ | ✔ | ✔ |
| Certificate Verification (QR Lookup, `[cg_verify_certificate]`) | ✔ | ✔ | ✔ |
| Certificate Analytics Dashboard | ✔ | ✔ | ✔ |
| Serial Number Generation | ✔ | ✔ | ✔ |
| CSV Bulk Import/Export (capped on Free — see table above) | ✔ | ✔ | ✔ |
| Bulk ZIP Download | — | ✔ | ✔ |
| Email Templates | — | ✔ | ✔ |
| REST API Access | — | ✔ | ✔ |
| SMTP Diagnostics | — | ✔ | ✔ |
| Priority Support | — | ✔ | ✔ |
| 19,000+ Font Library | — | — | ✔ |
| Unlimited API Calls | — | — | ✔ |
| Multisite Support | — | — | ✔ |
| Remove Plugin Branding | ✔ | ✔ | ✔ |

> Note: "Remove Plugin Branding" is included on every plan because the plugin currently has no
> branding/watermark output to remove — it's listed for completeness, not as a gated feature.

## Features that exist in the plugin but aren't plan-gated

These ship with the plugin and work identically on every plan (no `CG_License_Manager` check in
their code), which is why they're marked ✔ across the board above:

- Certificate Verification / QR lookup (`includes/Public/verification.php`)
- Certificate Analytics Dashboard (`includes/Admin/analytics.php`)
- Serial Number generation & settings (`includes/Admin/bulk-serial.php`)

## License keys (local/offline fallback)

When no remote license server is configured (`CG_LICENSE_SERVER` constant / `cg_license_server_url`
option), license keys are validated locally by prefix:

| Prefix | Plan | Expiry |
|---|---|---|
| `PRO-...` | Pro | +1 year from activation (or `2099-12-31` if key ends `-LIFETIME`/`-LOCAL`) |
| `BIZ-...` | Business | +1 year from activation (or `2099-12-31` if key ends `-LIFETIME`/`-LOCAL`) |

When a remote license server *is* configured, keys are validated against
`POST {server}/api/payments/activate-remote` instead, and the plan/expiry come from that response.

## Multisite

Business plan required for network-wide activation. Free/Pro network-activated installs show an
admin notice and track usage per-site independently (see `cg_multisite_plan_notice()`).
