// Must be imported before any route is registered — patches Express so a
// rejected promise/thrown error in an async handler reaches the error
// middleware below instead of becoming an unhandled rejection that crashes
// the whole process (this is exactly how the Stripe checkout route did,
// taking down every user's connection over one missing env var).
import "express-async-errors";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import { logger } from "./logger.js";
import { openApiSpec } from "./openapi.js";
import { adminRouter } from "./routes/admin.js";
import { apiKeysRouter } from "./routes/apiKeys.js";
import { authRouter } from "./routes/auth.js";
import { billingRouter, checkoutRouter } from "./routes/checkout.js";
import { downloadsRouter } from "./routes/downloads.js";
import { licensesRouter } from "./routes/licenses.js";
import { notificationsRouter } from "./routes/notifications.js";
import { organizationsRouter } from "./routes/organizations.js";
import { plansRouter } from "./routes/plans.js";
import { pluginLicenseRouter } from "./routes/pluginLicense.js";
import { stripeWebhookRouter } from "./routes/stripeWebhook.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { supportRouter } from "./routes/support.js";

export function createApp() {
  const app = express();

  // CSP off: this is a JSON API, not an HTML app — the only HTML it serves is
  // swagger-ui at /api/docs, whose inline scripts the default CSP would block.
  // The other headers (X-Frame-Options, X-Content-Type-Options, HSTS, etc.) stay on.
  app.use(helmet({ contentSecurityPolicy: false }));

  // In production this is a single trusted origin. In dev, Next.js auto-increments
  // to 3001/3002/etc. when 3000 is busy — allow the common range so a second
  // concurrent dev server doesn't get silently CORS-blocked.
  const isProd = process.env.NODE_ENV === "production";
  const allowedOrigins = isProd
    ? [process.env.APP_URL ?? "http://localhost:3000"]
    : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(pinoHttp({ logger, autoLogging: process.env.NODE_ENV !== "test" }));

  // Stripe needs the raw body to verify the signature — must be mounted before express.json().
  app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhookRouter);

  app.use(cookieParser());
  app.use(express.json());

  // Bare /health for our own infra checks; /api/health is what the WP plugin's
  // "Test Connection" button calls (includes/Admin/settings.php:1101).
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.get("/api/openapi.json", (_req, res) => res.json(openApiSpec));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  const authLimiter = rateLimit({ windowMs: 60_000, limit: 5 });
  app.use("/api/auth/login", authLimiter);

  const licenseLimiter = rateLimit({ windowMs: 60_000, limit: 60 });
  app.use("/api/payments", licenseLimiter, pluginLicenseRouter);

  app.use("/api/auth", authRouter);
  app.use("/api/plans", plansRouter);
  app.use("/api/checkout", checkoutRouter);
  app.use("/api/billing", billingRouter);
  app.use("/api/licenses", licensesRouter);
  app.use("/api/subscriptions", subscriptionsRouter);
  app.use("/api/organizations", organizationsRouter);
  app.use("/api/downloads", downloadsRouter);
  app.use("/api/api-keys", apiKeysRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/support", supportRouter);
  app.use("/api/admin", adminRouter);

  // Catches every error forwarded by express-async-errors (or a manual next(err))
  // from any route above — a 500 for the one request, not a crashed process.
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, "unhandled request error");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
  });

  return app;
}
