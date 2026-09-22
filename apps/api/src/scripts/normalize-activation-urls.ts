/**
 * One-time migration: normalizes existing Activation.site_url values (raw,
 * exact-match strings) to the same form licenseService.normalizeSiteUrl()
 * now uses for every activate/deactivate/usage lookup. Without this, old
 * rows would stop matching new normalized lookups and each site would
 * silently get re-activated as if it were new.
 *
 * If two rows for the same license collide after normalization (e.g. the
 * site was activated once as http:// and once as https://), keeps the
 * earliest activation and drops the rest — never increases seat usage.
 *
 * Usage: npx tsx src/scripts/normalize-activation-urls.ts
 */
import "dotenv/config";
import { connectDb } from "../db.js";
import { Activation } from "../models/Activation.js";
import { normalizeSiteUrl } from "../services/licenseService.js";

async function main() {
  await connectDb(process.env.MONGODB_URI ?? "mongodb://localhost:27017/certificate-license-platform");

  const activations = await Activation.find().sort({ activated_at: 1 });
  const seen = new Map<string, string>(); // "license_id:normalized_url" -> kept Activation _id
  let updated = 0;
  let deduped = 0;

  for (const activation of activations) {
    const normalized = normalizeSiteUrl(activation.site_url);
    const key = `${activation.license_id.toString()}:${normalized}`;

    if (seen.has(key)) {
      await Activation.deleteOne({ _id: activation._id });
      deduped += 1;
      continue;
    }

    seen.set(key, activation._id.toString());
    if (normalized !== activation.site_url) {
      activation.site_url = normalized;
      await activation.save();
      updated += 1;
    }
  }

  console.log(`Normalized ${updated} activation(s), deduped ${deduped} duplicate(s), ${activations.length} scanned.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
