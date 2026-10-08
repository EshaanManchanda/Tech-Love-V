"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { API_URL, api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PublicProduct {
  name: string;
  slug: string;
  current_version: string | null;
}

export default function DownloadsPage() {
  const { data: products, isLoading } = useQuery<PublicProduct[]>({
    queryKey: ["products"],
    queryFn: () => api("/api/products"),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Downloads</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Loading plugins…</p>}

      {products?.map((product) => (
        <Card key={product.slug}>
          <CardHeader>
            <CardTitle>{product.name} plugin</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {product.current_version ? `Version ${product.current_version}` : "No release uploaded yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Works on every plan — Free needs no license key at all.</p>
            </div>
            {product.current_version && (
              <a href={`${API_URL}/api/downloads/plugin?product=${encodeURIComponent(product.slug)}`}>
                <Button>
                  <Download className="mr-2 h-4 w-4" /> Download .zip
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
