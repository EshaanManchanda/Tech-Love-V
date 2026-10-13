"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
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
  refund_eligible_until: string | null;
}

export default function BillingPage() {
  const { data: subscriptions, isLoading } = useQuery<Subscription[]>({
    queryKey: ["subscriptions", "me"],
    queryFn: () => api("/api/subscriptions/me"),
  });

  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["subscriptions", "me"] });
    queryClient.invalidateQueries({ queryKey: ["licenses", "me"] });
  };
  const cancel = useMutation({
    mutationFn: (id: string) => api<{ refunded: boolean }>(`/api/subscriptions/${id}/cancel`, { method: "POST" }),
    onSuccess: ({ refunded }) => {
      refresh();
      toast.success(refunded ? "Cancelled and refunded in full — the money is back in 5–10 business days." : "Cancelled. Your license keeps working until the period ends.");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't cancel."),
  });
  const resume = useMutation({
    mutationFn: (id: string) => api(`/api/subscriptions/${id}/resume`, { method: "POST" }),
    onSuccess: () => {
      refresh();
      toast.success("Resumed — your subscription will renew as usual.");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't resume."),
  });

  function confirmCancel(sub: Subscription) {
    const end = new Date(sub.current_period_end).toLocaleDateString();
    const message = sub.refund_eligible_until
      ? "You're within the 7-day refund window: you'll get a full refund and the license stops working now. Cancel?"
      : `Your license keeps working until ${end}, then stops. This cancellation isn't refunded. Cancel?`;
    if (confirm(message)) cancel.mutate(sub._id);
  }

  const pastDue = subscriptions?.some((s) => s.status === "past_due" || s.status === "unpaid");
  const [opening, setOpening] = useState(false);

  async function manageBilling() {
    setOpening(true);
    try {
      const { url } = await api<{ url: string }>("/api/billing/portal", { method: "POST" });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't open the billing portal.");
      setOpening(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Billing</h1>
        {!!subscriptions?.length && (
          <Button onClick={manageBilling} disabled={opening}>
            {opening ? "Opening…" : "Manage billing"}
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Payment methods, invoices, and plan changes are all handled in the Lemon Squeezy customer portal — click "Manage billing" above.
      </p>

      {pastDue && (
        <Card className="border-destructive">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
            <span>Your last payment didn&apos;t go through. Update your card to keep your license active.</span>
            <Button size="sm" onClick={manageBilling} disabled={opening}>
              Update payment method
            </Button>
          </CardContent>
        </Card>
      )}

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
              <a href="/certificate-generator/pricing">
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
              {sub.status === "cancelled" ? (
                <p>Refunded and cancelled</p>
              ) : (
                <p>
                  {sub.cancel_at_period_end ? "Ends on" : "Renews on"} {new Date(sub.current_period_end).toLocaleDateString()}
                </p>
              )}
              {sub.refund_eligible_until && (
                <p>Full refund available if you cancel before {new Date(sub.refund_eligible_until).toLocaleDateString()}</p>
              )}
              {sub.status !== "cancelled" && sub.status !== "expired" && (
                <div className="pt-3">
                  {sub.cancel_at_period_end ? (
                    <Button variant="outline" size="sm" disabled={resume.isPending} onClick={() => resume.mutate(sub._id)}>
                      Resume subscription
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled={cancel.isPending} onClick={() => confirmCancel(sub)}>
                      {sub.refund_eligible_until ? "Cancel & refund" : "Cancel subscription"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
