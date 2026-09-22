/**
 * Dev utility: set a user's role directly in the DB (no admin UI for this yet, by design —
 * granting admin access is a rare, high-trust action taken outside the app).
 * Usage: npx tsx src/scripts/set-user-role.ts user@example.com admin
 */
import "dotenv/config";
import { connectDb } from "../db.js";
import { User } from "../models/User.js";

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || (role !== "admin" && role !== "customer")) {
    console.error("Usage: npx tsx src/scripts/set-user-role.ts <email> <admin|customer>");
    process.exit(1);
  }

  await connectDb(process.env.MONGODB_URI ?? "mongodb://localhost:27017/certificate-license-platform");
  const result = await User.updateOne({ email }, { role });
  const user = await User.findOne({ email }).select("name email role");
  console.log(`matched: ${result.matchedCount}`, user ? `→ ${user.email} is now ${user.role}` : "(user not found)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
