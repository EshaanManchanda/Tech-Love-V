import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PLUGIN_CATALOG } from "@/lib/plugin-catalog";

export const metadata: Metadata = {
  title: "All Plugins — Tech Love V",
  description: "Every WordPress plugin published by Tech Love V, by Eshaan Manchanda.",
};

export default function PluginsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-center font-display text-3xl font-bold text-slate-900">All Plugins</h1>
      <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
        Every WordPress plugin published by Tech Love V — one license system, one dashboard, one place to manage all of it.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {PLUGIN_CATALOG.map((plugin) => (
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
