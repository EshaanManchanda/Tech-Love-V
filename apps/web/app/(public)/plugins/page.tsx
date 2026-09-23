import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { API_URL } from "@/lib/api";
import { PLUGIN_CATALOG, type PluginCatalogEntry } from "@/lib/plugin-catalog";

export const metadata: Metadata = {
  title: "All Plugins — Tech Love V",
  description: "Every WordPress plugin published by Tech Love V, by Eshaan Manchanda.",
};

// The two original plugins keep their curated PLUGIN_CATALOG entry (custom
// tagline/accent color); anything created later via the admin Products CMS
// shows up here automatically from the DB with a generic accent.
async function getDbOnlyProducts(): Promise<PluginCatalogEntry[]> {
  const knownSlugs = new Set(PLUGIN_CATALOG.map((p) => p.slug));
  try {
    const res = await fetch(`${API_URL}/api/products`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const products: { slug: string; name: string; tagline?: string }[] = await res.json();
    return products
      .filter((p) => !knownSlugs.has(p.slug))
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        tagline: p.tagline ?? "",
        startingPrice: "",
        href: `/plugins/${p.slug}`,
        accent: "border-t-slate-400",
      }));
  } catch {
    return []; // API unreachable (e.g. during a build with no API running) — the two static plugins still render fine
  }
}

export default async function PluginsPage() {
  const catalog = [...PLUGIN_CATALOG, ...(await getDbOnlyProducts())];

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-center font-display text-3xl font-bold text-slate-900">All Plugins</h1>
      <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
        Every WordPress plugin published by Tech Love V — one license system, one dashboard, one place to manage all of it.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {catalog.map((plugin) => (
          <Link key={plugin.slug} href={plugin.href}>
            <Card className={`h-full overflow-hidden border-t-4 ${plugin.accent} transition-shadow hover:shadow-lg`}>
              <CardContent className="pt-6">
                <h2 className="font-display text-xl font-semibold text-slate-900">{plugin.name}</h2>
                <p className="mt-2 text-sm text-slate-600">{plugin.tagline}</p>
                <p className="mt-4 text-sm font-medium text-brand-700">{plugin.startingPrice}</p>
                <span className="mt-4 inline-block text-sm font-medium text-brand-600">Learn more →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
