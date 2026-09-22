"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, KeyRound, LifeBuoy } from "lucide-react";
import { api } from "@/lib/api";
import { useUser } from "@/lib/useUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface LicenseSummary {
  _id: string;
  plan: "pro" | "business";
  status: string;
  expires_at: string;
  activations: unknown[];
  activation_limit: number;
}

export default function DashboardOverviewPage() {
  const { data: user } = useUser();
  const { data: licenses, isLoading } = useQuery<LicenseSummary[]>({
    queryKey: ["licenses", "me"],
    queryFn: () => api("/api/licenses/me"),
    enabled: !!user,
  });

  const activeLicenses = licenses?.filter((l) => l.status === "active") ?? [];
  const nextExpiry = activeLicenses.map((l) => l.expires_at).sort()[0];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Welcome, {user?.name}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active licenses</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-10" /> : activeLicenses.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next renewal</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{isLoading ? <Skeleton className="h-9 w-24" /> : (nextExpiry ?? "—")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-5 w-14" />
            ) : activeLicenses.length > 0 ? (
              <Badge className="text-sm capitalize">{activeLicenses[0].plan}</Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/dashboard/downloads">
          <Card className="transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-3 pt-6">
              <Download className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Download the plugin</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/licenses">
          <Card className="transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-3 pt-6">
              <KeyRound className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Manage licenses</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/support">
          <Card className="transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-3 pt-6">
              <LifeBuoy className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Get support</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {!isLoading && activeLicenses.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <p className="text-sm text-muted-foreground">No active license yet — the Free plan works with no license key at all.</p>
            <Link href="/pricing">
              <Button>View plans</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
