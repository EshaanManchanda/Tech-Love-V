"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { API_URL, api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PluginInfo {
  version: string;
  filename: string;
}

export default function DownloadsPage() {
  const { data: pluginInfo } = useQuery<PluginInfo>({
    queryKey: ["plugin", "info"],
    queryFn: () => api("/api/downloads/plugin/info"),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Downloads</h1>

      <Card>
        <CardHeader>
          <CardTitle>Certificate Generator plugin</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{pluginInfo ? `Version ${pluginInfo.version}` : "Loading version…"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Works on every plan — Free needs no license key at all.</p>
          </div>
          <a href={`${API_URL}/api/downloads/plugin`}>
            <Button>
              <Download className="mr-2 h-4 w-4" /> Download .zip
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
