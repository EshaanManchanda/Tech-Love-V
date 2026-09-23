/**
 * One-off migration: seeds each existing product's first `versions[]` entry
 * from the old hardcoded config/plugin.ts values, so the new DB-driven
 * download route (routes/downloads.ts) has something to serve. Idempotent —
 * skips a product that already has a version.
 *
 * Usage: npx tsx src/scripts/migrate-product-versions.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDb } from "../db.js";
import { Product } from "../models/Product.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const downloadsDir = path.join(__dirname, "..", "..", "public", "downloads");

const LEGACY_VERSIONS: Record<string, { version: string; zipPath: string; filename: string }> = {
  "certificate-generator": {
    version: "7.0.0",
    zipPath: path.join(downloadsDir, "certificate-generator-latest.zip"),
    filename: "Certificate-Generator.zip",
  },
  "dynamic-tags": {
    version: "4.0.0",
    zipPath: path.join(downloadsDir, "dynamic-tags-latest.zip"),
    filename: "Dynamic-Tags.zip",
  },
};

async function main() {
  await connectDb(process.env.MONGODB_URI ?? "mongodb://localhost:27017/certificate-license-platform");

  for (const [slug, legacy] of Object.entries(LEGACY_VERSIONS)) {
    const product = await Product.findOne({ slug });
    if (!product) {
      console.log(`skip ${slug}: product not found (run seed-plans.ts first)`);
      continue;
    }
    if (product.versions.length > 0) {
      console.log(`skip ${slug}: already has version history`);
      continue;
    }
    if (!fs.existsSync(legacy.zipPath)) {
      console.log(`skip ${slug}: ${legacy.zipPath} not on disk yet`);
      continue;
    }

    product.versions.push({
      version: legacy.version,
      zip_filename: legacy.filename,
      zip_path: legacy.zipPath,
      file_size: fs.statSync(legacy.zipPath).size,
      released_at: new Date(),
      is_current: true,
    } as never);
    await product.save();
    console.log(`seeded ${slug} v${legacy.version}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
