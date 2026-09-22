/**
 * Hand-authored OpenAPI 3.0 spec — kept in sync by hand with the routers in
 * src/routes/. Served as JSON at GET /api/openapi.json and as an interactive
 * UI at GET /api/docs (see app.ts).
 */
const cookieAuth = { cookieAuth: [] };

const errorSchema = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: { code: { type: "string" }, message: { type: "string" } },
    },
  },
};

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Certificate License Platform API",
    version: "1.0.0",
    description:
      "Licensing, billing, and customer/admin portal API for the Certificate Generator WordPress plugin. " +
      "Two audiences share this API: the Next.js web app (cookie session auth) and the WordPress plugin itself " +
      "(the unauthenticated, rate-limited `/api/payments/*` endpoints matching `CG_License_Manager::remote_validate()`).",
  },
  servers: [{ url: "http://localhost:4000" }],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "access_token" },
    },
    schemas: {
      Error: errorSchema,
      User: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["customer", "admin"] },
        },
      },
      License: {
        type: "object",
        properties: {
          _id: { type: "string" },
          license_key: { type: "string", example: "PRO-A1B2-C3D4-E5F6-A7B8" },
          plan: { type: "string", enum: ["pro", "business", "paid"] },
          status: { type: "string", enum: ["active", "expired", "cancelled", "suspended"] },
          expires_at: { type: "string", example: "2027-09-09" },
          activation_limit: { type: "integer" },
          flagged: { type: "boolean" },
        },
      },
      Subscription: {
        type: "object",
        properties: {
          _id: { type: "string" },
          plan: { type: "string", enum: ["pro", "business", "paid"] },
          status: { type: "string" },
          billing_cycle: { type: "string", enum: ["monthly", "yearly"] },
          current_period_end: { type: "string", format: "date-time" },
          cancel_at_period_end: { type: "boolean" },
        },
      },
      SupportTicket: {
        type: "object",
        properties: {
          _id: { type: "string" },
          subject: { type: "string" },
          category: { type: "string", enum: ["billing", "license", "plugin", "bug", "feature_request", "other"] },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          status: { type: "string", enum: ["open", "in_progress", "waiting_customer", "resolved", "closed"] },
        },
      },
      Coupon: {
        type: "object",
        properties: {
          _id: { type: "string" },
          code: { type: "string" },
          type: { type: "string", enum: ["percentage", "fixed_amount", "free_trial", "free_months"] },
          value: { type: "number" },
          status: { type: "string", enum: ["active", "disabled"] },
        },
      },
      PluginValidationResponse: {
        type: "object",
        description: "Shape consumed by CG_License_Manager::remote_validate() in the plugin.",
        properties: {
          success: { type: "boolean" },
          valid: { type: "boolean" },
          status: { type: "string", enum: ["active", "invalid", "expired", "suspended", "cancelled"] },
          plan: { type: "string", enum: ["pro", "business", "paid"] },
          expiry: { type: "string", example: "2027-09-09" },
          limits: {
            type: "object",
            description: "Effective per-license limits — plan defaults merged with any admin-set custom_terms override. Additive field; older plugin builds that don't read it are unaffected.",
            properties: {
              activation_limit: { type: "number" },
              cert_limit: { type: "number", description: "Certificates/month; 0 = unlimited." },
              bulk_cap: { type: "number", description: "Bulk import/export row cap; 0 = unlimited." },
            },
          },
          message: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/health": { get: { summary: "Liveness check", tags: ["Health"], responses: { "200": { description: "OK" } } } },
    "/api/health": {
      get: {
        summary: "Liveness check (called by the plugin's 'Test Connection' button)",
        tags: ["Health"],
        responses: { "200": { description: "OK" } },
      },
    },

    "/api/auth/register": {
      post: {
        summary: "Create an account",
        tags: ["Auth"],
        requestBody: { content: { "application/json": { schema: { properties: { name: {}, email: {}, password: {} } } } } },
        responses: { "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Log in (rate-limited: 5/min)",
        tags: ["Auth"],
        requestBody: { content: { "application/json": { schema: { properties: { email: {}, password: {} } } } } },
        responses: { "200": { description: "OK" }, "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
    },
    "/api/auth/refresh": { post: { summary: "Rotate access/refresh cookies", tags: ["Auth"], responses: { "204": { description: "OK" } } } },
    "/api/auth/logout": { post: { summary: "Clear session cookies", tags: ["Auth"], responses: { "204": { description: "OK" } } } },
    "/api/auth/me": {
      get: {
        summary: "Current user",
        tags: ["Auth"],
        security: [cookieAuth],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
      },
    },

    "/api/plans": {
      get: {
        summary: "List active plans",
        tags: ["Plans"],
        parameters: [{ name: "product", in: "query", required: false, schema: { type: "string", enum: ["certificate-generator", "dynamic-tags"] }, description: "Defaults to certificate-generator." }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/plans/compare": {
      get: {
        summary: "Plan + feature comparison matrix for the pricing page",
        tags: ["Plans"],
        parameters: [{ name: "product", in: "query", required: false, schema: { type: "string", enum: ["certificate-generator", "dynamic-tags"] }, description: "Defaults to certificate-generator." }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/plans/{slug}": {
      get: {
        summary: "One plan by slug",
        tags: ["Plans"],
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string", enum: ["free", "pro", "business", "paid"] } },
          { name: "product", in: "query", required: false, schema: { type: "string", enum: ["certificate-generator", "dynamic-tags"] }, description: "Defaults to certificate-generator." },
        ],
        responses: { "200": { description: "OK" }, "404": { description: "Not found" } },
      },
    },

    "/api/checkout/session": {
      post: {
        summary: "Create a Stripe Checkout session",
        tags: ["Billing"],
        security: [cookieAuth],
        requestBody: { content: { "application/json": { schema: { properties: { plan: { enum: ["pro", "business", "paid"] }, billing_cycle: { enum: ["monthly", "yearly"] }, coupon_code: {} } } } } },
        responses: { "200": { description: "OK — { url }" } },
      },
    },
    "/api/billing/portal": {
      post: { summary: "Create a Stripe Billing Portal session", tags: ["Billing"], security: [cookieAuth], responses: { "200": { description: "OK — { url }" } } },
    },
    "/api/webhooks/stripe": {
      post: { summary: "Stripe webhook receiver (signature-verified, not for direct use)", tags: ["Billing"], responses: { "200": { description: "OK" } } },
    },

    "/api/licenses/me": {
      get: {
        summary: "List the caller's licenses with activations",
        tags: ["Licenses"],
        security: [cookieAuth],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/License" } } } } } },
      },
    },
    "/api/licenses/{id}/deactivate": {
      post: { summary: "Deactivate one of the caller's own activated sites", tags: ["Licenses"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "204": { description: "OK" } } },
    },
    "/api/licenses/{id}/transfer": {
      post: {
        summary: "Transfer license ownership to another account",
        tags: ["Licenses"],
        security: [cookieAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { properties: { email: {} } } } } },
        responses: { "200": { description: "OK" }, "400": { description: "Blocked (suspended/cancelled/active subscription)" } },
      },
    },
    "/api/licenses/{id}/regenerate-key": {
      post: { summary: "Regenerate the license key", tags: ["Licenses"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },

    "/api/subscriptions/me": {
      get: { summary: "List the caller's subscriptions", tags: ["Subscriptions"], security: [cookieAuth], responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Subscription" } } } } } } },
    },

    "/api/organizations": {
      get: { summary: "List the caller's organizations", tags: ["Organizations"], security: [cookieAuth], responses: { "200": { description: "OK" } } },
      post: { summary: "Create an additional organization", tags: ["Organizations"], security: [cookieAuth], responses: { "201": { description: "Created" } } },
    },
    "/api/organizations/{id}/members": {
      post: {
        summary: "Invite an existing user as a member (owner/admin only)",
        tags: ["Organizations"],
        security: [cookieAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { properties: { email: {}, role: { enum: ["admin", "billing_manager", "developer", "support"] } } } } } },
        responses: { "201": { description: "Created" }, "403": { description: "Forbidden" } },
      },
    },
    "/api/organizations/{id}/members/{userId}": {
      delete: {
        summary: "Remove a member (owner/admin only; cannot remove the owner)",
        tags: ["Organizations"],
        security: [cookieAuth],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "204": { description: "OK" } },
      },
    },

    "/api/downloads/plugin/info": { get: { summary: "Current plugin version metadata", tags: ["Downloads"], security: [cookieAuth], responses: { "200": { description: "OK" } } } },
    "/api/downloads/plugin": { get: { summary: "Download the plugin .zip", tags: ["Downloads"], security: [cookieAuth], responses: { "200": { description: "File stream" } } } },

    "/api/api-keys": {
      get: { summary: "List the caller's API keys (hash never returned)", tags: ["API Keys"], security: [cookieAuth], responses: { "200": { description: "OK" } } },
      post: {
        summary: "Create an API key (raw key shown once)",
        tags: ["API Keys"],
        security: [cookieAuth],
        requestBody: { content: { "application/json": { schema: { properties: { name: {} } } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/api-keys/{id}": {
      delete: { summary: "Revoke an API key", tags: ["API Keys"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "204": { description: "OK" } } },
    },

    "/api/notifications": { get: { summary: "List the caller's notifications", tags: ["Notifications"], security: [cookieAuth], responses: { "200": { description: "OK" } } } },
    "/api/notifications/{id}/read": {
      post: { summary: "Mark a notification read", tags: ["Notifications"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
    },

    "/api/support/tickets": {
      get: { summary: "List tickets (own for customers, all for admins)", tags: ["Support"], security: [cookieAuth], responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/SupportTicket" } } } } } } },
      post: {
        summary: "Create a ticket",
        tags: ["Support"],
        security: [cookieAuth],
        requestBody: { content: { "application/json": { schema: { properties: { subject: {}, category: {}, body: {} } } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/support/tickets/{id}": {
      get: { summary: "Ticket + message thread (owner or admin)", tags: ["Support"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" }, "404": { description: "Not found" } } },
    },
    "/api/support/tickets/{id}/messages": {
      post: {
        summary: "Reply on a ticket (customer or admin)",
        tags: ["Support"],
        security: [cookieAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { properties: { body: {} } } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/support/tickets/{id}/status": {
      post: { summary: "Change ticket status (admin only)", tags: ["Support"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" }, "403": { description: "Forbidden" } } },
    },
    "/api/support/tickets/{id}/assign": {
      post: { summary: "Assign a ticket to an admin (admin only)", tags: ["Support"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" }, "403": { description: "Forbidden" } } },
    },

    "/api/admin/customers": { get: { summary: "List customers", tags: ["Admin"], security: [cookieAuth], responses: { "200": { description: "OK" } } } },
    "/api/admin/licenses": { get: { summary: "List all licenses", tags: ["Admin"], security: [cookieAuth], responses: { "200": { description: "OK" } } } },
    "/api/admin/licenses/{id}/extend": { post: { summary: "Extend a license's expiry", tags: ["Admin"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/admin/licenses/{id}/disable": { post: { summary: "Suspend a license", tags: ["Admin"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/admin/licenses/{id}/enable": { post: { summary: "Re-activate a license", tags: ["Admin"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/admin/analytics/overview": { get: { summary: "MRR/ARR, plan distribution, license/subscription counts", tags: ["Admin"], security: [cookieAuth], responses: { "200": { description: "OK" } } } },
    "/api/admin/coupons": {
      get: { summary: "List coupons", tags: ["Admin"], security: [cookieAuth], responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Coupon" } } } } } } },
      post: { summary: "Create a coupon (auto-creates the matching Stripe coupon for percentage/fixed_amount)", tags: ["Admin"], security: [cookieAuth], responses: { "201": { description: "Created" } } },
    },
    "/api/admin/coupons/{id}/disable": { post: { summary: "Disable a coupon", tags: ["Admin"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/admin/users/{id}/impersonate": {
      post: {
        summary: "Start a short-lived (5m) impersonation session as another user — audit-logged",
        tags: ["Admin"],
        security: [cookieAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/admin/logs": { get: { summary: "Audit log, most recent first", tags: ["Admin"], security: [cookieAuth], responses: { "200": { description: "OK" } } } },
    "/api/admin/feature-flags": {
      get: { summary: "List feature flags", tags: ["Admin"], security: [cookieAuth], responses: { "200": { description: "OK" } } },
      post: { summary: "Create a feature flag", tags: ["Admin"], security: [cookieAuth], responses: { "201": { description: "Created" } } },
    },
    "/api/admin/feature-flags/{id}/toggle": { post: { summary: "Enable/disable a feature flag", tags: ["Admin"], security: [cookieAuth], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },

    "/api/payments/activate-remote": {
      post: {
        summary: "Plugin: activate/heartbeat a site (unauthenticated, rate-limited 60/min per the doc's design)",
        tags: ["Plugin (unauthenticated)"],
        description: "Called by CG_License_Manager::remote_validate() — both the initial activation and the twice-daily heartbeat hit this same endpoint.",
        requestBody: { content: { "application/json": { schema: { properties: { license_key: {}, site_url: {} } } } } },
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/PluginValidationResponse" } } } } },
      },
    },
    "/api/payments/verify-license": {
      post: {
        summary: "Plugin: read-only license check (defined for parity; not currently called by the plugin)",
        tags: ["Plugin (unauthenticated)"],
        requestBody: { content: { "application/json": { schema: { properties: { license_key: {} } } } } },
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/PluginValidationResponse" } } } } },
      },
    },
    "/api/payments/deactivate-remote": {
      post: {
        summary: "Plugin: deactivate a site (always 200, matches the plugin's fire-and-forget expectation)",
        tags: ["Plugin (unauthenticated)"],
        requestBody: { content: { "application/json": { schema: { properties: { license_key: {}, site_url: {} } } } } },
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/payments/usage": {
      post: {
        summary: "Plugin: fire-and-forget usage report (always 204, 1s timeout on the plugin side)",
        tags: ["Plugin (unauthenticated)"],
        requestBody: { content: { "application/json": { schema: { properties: { license_key: {}, site_url: {}, count: {} } } } } },
        responses: { "204": { description: "No Content" } },
      },
    },
  },
};
