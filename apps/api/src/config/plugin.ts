import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProductSlug } from "./plans.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const downloadsDir = path.join(__dirname, "..", "..", "public", "downloads");

interface PluginFile {
  version: string;
  zipPath: string;
  filename: string;
}

// Bumped by hand to match each plugin's actual header version until Phase 10's
// versioned release pipeline exists (see doc's known plugin-folder/header discrepancy).
export const PLUGIN_FILES: Record<ProductSlug, PluginFile> = {
  "certificate-generator": {
    version: "7.0.0",
    zipPath: path.join(downloadsDir, "certificate-generator-latest.zip"),
    filename: "Certificate-Generator.zip",
  },
  "dynamic-tags": {
    // Zip not supplied yet — endpoint is wired and ready for it.
    version: "4.0.0",
    zipPath: path.join(downloadsDir, "dynamic-tags-latest.zip"),
    filename: "Dynamic-Tags.zip",
  },
};
