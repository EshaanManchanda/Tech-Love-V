import "dotenv/config";
import { createApp } from "./app.js";
import { connectDb } from "./db.js";
import { logger } from "./logger.js";

const REQUIRED_ENV = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  logger.fatal(`Missing required environment variable(s): ${missing.join(", ")}. Set them in apps/api/.env before starting.`);
  process.exit(1);
}

const port = process.env.PORT ?? 4000;

connectDb(process.env.MONGODB_URI ?? "mongodb://localhost:27017/certificate-license-platform")
  .then(() => {
    createApp().listen(port, () => {
      logger.info(`API listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    logger.fatal({ err }, "Failed to connect to MongoDB");
    process.exit(1);
  });
