"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface Subscription {
  _id: string;
  plan: "pro" | "business";
  status: string;
  billing_cycle: "monthly" | "yearly";
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export default function BillingPage() {
  const { data: subscriptions, isLoading } = useQuery<Subscription[]>({
    queryKey: ["subscriptions", "me"],
    queryFn: () => api("/api/subscriptions/me"),
  });

  async function manageBilling() {
    const { url } = await api<{ url: string }>("/api/billing/portal", { method: "POST" });
    window.location.href = url;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Billing</h1>
        <Button onClick={manageBilling}>Manage billing</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Payment methods, invoices, and plan changes are all handled in Stripe's secure billing portal — click "Manage billing" above.
      </p>

      {isLoading && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      )}

      {!isLoading && subscriptions?.length === 0 && (
        <Card>
          <EmptyState
            icon={CreditCard}
            title="You're on the Free plan"
            description="No subscription yet — upgrade for higher limits and premium features."
            action={
              <a href="/pricing">
                <Button size="sm">View paid plans</Button>
              </a>
            }
          />
        </Card>
      )}

      <div className="space-y-4">
        {subscriptions?.map((sub) => (
          <Card key={sub._id}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base capitalize">{sub.plan} plan</CardTitle>
              <Badge variant={sub.status === "active" ? "success" : "secondary"} className="capitalize">
                {sub.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>Billed {sub.billing_cycle}</p>
              <p>
                {sub.cancel_at_period_end ? "Cancels on" : "Renews on"} {new Date(sub.current_period_end).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
