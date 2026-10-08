import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";
import { CG_DOCS } from "@/lib/cg-docs";
import { CG_FEATURES } from "@/lib/cg-features";
import { getCatalog } from "@/lib/plugin-catalog";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getCatalog();
  const paths = [
    "/",
    "/plugins",
    ...catalog.map((p) => p.href),
    "/certificate-generator/pricing",
    "/certificate-generator/product-facts",
    "/certificate-generator/compare",
    "/certificate-generator/requirements",
    "/dynamic-tags/pricing",
    ...CG_FEATURES.map((f) => `/certificate-generator/${f.slug}`),
    "/docs",
    ...CG_DOCS.map((d) => `/docs/certificate-generator/${d.slug}`),
    "/blog",
    ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
  ];
  return paths.map((path) => ({ url: `${SITE_URL}${path}` }));
}
