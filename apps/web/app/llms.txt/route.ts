import { BLOG_POSTS } from "@/lib/blog";
import { CG_DOCS } from "@/lib/cg-docs";
import { CG_FEATURES } from "@/lib/cg-features";
import { getCatalog } from "@/lib/plugin-catalog";
import { CG_ENTITY_SENTENCE, DT_ENTITY_SENTENCE, SITE_URL } from "@/lib/site";

// /llms.txt (llmstxt.org): a plain-markdown map of the site for AI assistants
// and crawlers. Products come from the admin CMS via getCatalog(), so a newly
// published plugin is listed here without a code change.
export const revalidate = 3600;

const DEFINITIONS: Record<string, string> = {
  "certificate-generator": CG_ENTITY_SENTENCE,
  "dynamic-tags": DT_ENTITY_SENTENCE,
};

export async function GET() {
  const catalog = await getCatalog();
  const link = (path: string, title: string, note?: string) => `- [${title}](${SITE_URL}${path})${note ? `: ${note}` : ""}`;

  const body = [
    "# Tech Love V",
    "",
    "> WordPress plugins by Eshaan Manchanda, each with a free plan and public, transparent pricing. Licenses, billing and downloads are managed from one customer dashboard.",
    "",
    "## Plugins",
    "",
    ...catalog.map((p) => link(p.href, p.name, DEFINITIONS[p.slug] ?? p.tagline)),
    "",
    "## Certificate Generator",
    "",
    link("/certificate-generator/product-facts", "Product facts", "verifiable facts, requirements and the plan matrix"),
    link("/certificate-generator/pricing", "Pricing"),
    link("/certificate-generator/compare", "How to choose a WordPress certificate plugin"),
    ...CG_FEATURES.map((f) => link(`/certificate-generator/${f.slug}`, f.h1, f.description)),
    "",
    "## Certificate Generator documentation",
    "",
    ...CG_DOCS.map((d) => link(`/docs/certificate-generator/${d.slug}`, d.title, d.description)),
    "",
    "## Dynamic Tags",
    "",
    link("/dynamic-tags/pricing", "Dynamic Tags pricing"),
    "",
    "## Optional",
    "",
    ...BLOG_POSTS.map((p) => link(`/blog/${p.slug}`, p.title, p.description)),
    "",
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
