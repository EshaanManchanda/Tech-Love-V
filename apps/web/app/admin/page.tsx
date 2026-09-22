"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsOverview {
  totalCustomers: number;
  licensesByStatus: Record<string, number>;
  flaggedLicenses: number;
  activeSubscriptions: number;
  planDistribution: Record<string, number>;
  mrr: number;
  arr: number;
  avgSitesPerLicense: number;
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["admin", "analytics", "overview"],
    queryFn: () => api("/api/admin/analytics/overview"),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Overview</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">${data.mrr.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ARR</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">${data.arr.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{data.totalCustomers}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{data.activeSubscriptions}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Licenses by status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(data.licensesByStatus).map(([status, count]) => (
              <Badge key={status} variant="secondary" className="capitalize">
                {status}: {count}
              </Badge>
            ))}
            {data.flaggedLicenses > 0 && <Badge variant="warning">{data.flaggedLicenses} flagged for suspicious activity</Badge>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.planDistribution).map(([plan, count]) => (
                <Badge key={plan} className="capitalize">
                  {plan}: {count}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Avg. {data.avgSitesPerLicense} activated sites per license</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
