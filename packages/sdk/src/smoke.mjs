// Minimal self-check, no test framework — run via `node --experimental-strip-types src/smoke.mjs`
// after `npm run build`, or against dist/ directly: `node dist/../src/smoke.mjs` is not valid,
// so this imports the built output.
import assert from "node:assert/strict";
import { CertificateLicenseClient } from "../dist/index.js";

const calls = [];
const fakeFetch = async (url, init) => {
  calls.push({ url, body: JSON.parse(init.body) });
  if (url.endsWith("/usage")) return { status: 204, json: async () => ({}) };
  return { status: 200, json: async () => ({ success: true, valid: true, status: "active", plan: "pro", expiry: "2099-01-01" }) };
};

const client = new CertificateLicenseClient({ baseUrl: "https://example.test/", fetchImpl: fakeFetch });

const activation = await client.activateSite("CG-TEST", "https://site.example");
assert.equal(calls[0].url, "https://example.test/api/payments/activate-remote");
assert.deepEqual(calls[0].body, { license_key: "CG-TEST", site_url: "https://site.example" });
assert.equal(activation.valid, true);

await client.reportUsage("CG-TEST", "https://site.example", 3);
assert.equal(calls[1].url, "https://example.test/api/payments/usage");
assert.deepEqual(calls[1].body, { license_key: "CG-TEST", site_url: "https://site.example", count: 3 });

console.log("sdk smoke check passed");
