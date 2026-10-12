"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { API_URL, api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PublicProduct {
  name: string;
  slug: string;
  current_version: string | null;
  pro_version: string | null;
}

interface License {
  product?: string;
  plan: string;
  status: string;
  expires_at: string;
}

const downloadUrl = (slug: string, edition: "free" | "pro") =>
  `${API_URL}/api/downloads/plugin?product=${encodeURIComponent(slug)}&edition=${edition}`;

export default function DownloadsPage() {
  const { data: products, isLoading } = useQuery<PublicProduct[]>({
    queryKey: ["products"],
    queryFn: () => api("/api/products"),
  });
  const { data: licenses } = useQuery<License[]>({
    queryKey: ["licenses", "me"],
    queryFn: () => api("/api/licenses/me"),
  });

  // Mirrors the API's Pro download check (routes/downloads.ts).
  const today = new Date().toISOString().slice(0, 10);
  const hasPro = (slug: string) =>
    licenses?.some(
      (l) => (l.product ?? "certificate-generator") === slug && ["pro", "business"].includes(l.plan) && l.status === "active" && l.expires_at >= today,
    ) ?? false;

  // Arriving from registration with ?autostart=<slug>: start the free download.
  // The response is an attachment, so the page stays put.
  const started = useRef(false);
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("autostart");
    if (started.current || !slug || !/^[a-z0-9-]+$/.test(slug)) return;
    started.current = true;
    window.location.assign(downloadUrl(slug, "free"));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Downloads</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Loading plugins…</p>}

      {products?.map((product) => (
        <Card key={product.slug}>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Free plugin</p>
                <p className="text-sm text-muted-foreground">
                  {product.current_version ? `Version ${product.current_version} · no license key needed` : "No release uploaded yet"}
                </p>
              </div>
              {product.current_version && (
                <a href={downloadUrl(product.slug, "free")}>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Download .zip
                  </Button>
                </a>
              )}
            </div>

            {product.pro_version && (
              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <div>
                  <p className="font-medium">Pro add-on</p>
                  <p className="text-sm text-muted-foreground">
                    Version {product.pro_version} · install alongside the free plugin, then activate your license key
                  </p>
                </div>
                {hasPro(product.slug) ? (
                  <a href={downloadUrl(product.slug, "pro")}>
                    <Button>
                      <Download className="mr-2 h-4 w-4" /> Download .zip
                    </Button>
                  </a>
                ) : (
                  <Link href={`/${product.slug}/pricing`}>
                    <Button>Upgrade to Pro</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
