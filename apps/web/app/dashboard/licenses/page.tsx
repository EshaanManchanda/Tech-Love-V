"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface Activation {
  _id: string;
  site_url: string;
  activated_at: string;
  last_check_at: string;
}

interface LicenseWithActivations {
  _id: string;
  license_key: string;
  plan: "pro" | "business";
  status: string;
  expires_at: string;
  activation_limit: number;
  flagged?: boolean;
  activations: Activation[];
}

export default function LicensesPage() {
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [transferEmail, setTransferEmail] = useState("");
  const [transferTarget, setTransferTarget] = useState<string | null>(null);

  const { data: licenses, isLoading } = useQuery<LicenseWithActivations[]>({
    queryKey: ["licenses", "me"],
    queryFn: () => api("/api/licenses/me"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["licenses", "me"] });

  const deactivate = useMutation({
    mutationFn: ({ licenseId, siteUrl }: { licenseId: string; siteUrl: string }) =>
      api(`/api/licenses/${licenseId}/deactivate`, { method: "POST", body: JSON.stringify({ site_url: siteUrl }) }),
    onSuccess: invalidate,
  });

  const regenerate = useMutation({
    mutationFn: (licenseId: string) => api(`/api/licenses/${licenseId}/regenerate-key`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast.success("License key regenerated — update it in the plugin's License tab.");
    },
    onError: () => toast.error("Couldn't regenerate the key."),
  });

  const transfer = useMutation({
    mutationFn: ({ licenseId, email }: { licenseId: string; email: string }) =>
      api(`/api/licenses/${licenseId}/transfer`, { method: "POST", body: JSON.stringify({ email }) }),
    onSuccess: () => {
      invalidate();
      setTransferTarget(null);
      setTransferEmail("");
      toast.success("License transferred.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Transfer failed."),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Licenses</h1>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Licenses</h1>

      {licenses?.length === 0 && (
        <Card>
          <EmptyState
            icon={KeyRound}
            title="No license yet"
            description="The Free plan works with no license key. Subscribe to a paid plan to get one."
            action={
              <a href="/certificate-generator/pricing">
                <Button size="sm">View plans</Button>
              </a>
            }
          />
        </Card>
      )}

      <div className="space-y-4">
        {licenses?.map((license) => (
          <Card key={license._id}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Badge className="capitalize">{license.plan}</Badge>
                <Badge variant={license.status === "active" ? "seal" : "secondary"} className="uppercase">
                  {license.status}
                </Badge>
                {license.flagged && <Badge variant="warning">Flagged for review</Badge>}
              </div>
              <span className="text-sm text-muted-foreground">Expires {license.expires_at}</span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
                <span>{revealed[license._id] ? license.license_key : "•".repeat(license.license_key.length)}</span>
                <button className="text-xs underline" onClick={() => setRevealed((r) => ({ ...r, [license._id]: !r[license._id] }))}>
                  {revealed[license._id] ? "Hide" : "Reveal"}
                </button>
                <button className="text-xs underline" onClick={() => navigator.clipboard.writeText(license.license_key)}>
                  Copy
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium">
                  Activated sites ({license.activations.length}/{license.activation_limit})
                </h3>
                <ul className="mt-2 space-y-2">
                  {license.activations.map((a) => (
                    <li key={a._id} className="flex items-center justify-between text-sm">
                      <span>{a.site_url}</span>
                      <button
                        className="text-xs text-destructive underline"
                        onClick={() => deactivate.mutate({ licenseId: license._id, siteUrl: a.site_url })}
                      >
                        Deactivate
                      </button>
                    </li>
                  ))}
                  {license.activations.length === 0 && <li className="text-sm text-muted-foreground">No sites activated yet.</li>}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("Regenerate this license key? The old key will stop working immediately.")) regenerate.mutate(license._id);
                  }}
                >
                  Regenerate key
                </Button>
                <Dialog open={transferTarget === license._id} onOpenChange={(open) => setTransferTarget(open ? license._id : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Transfer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Transfer license</DialogTitle>
                    </DialogHeader>
                    <Label htmlFor="transfer-email">New owner's email</Label>
                    <Input id="transfer-email" type="email" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} className="mt-1" />
                    <DialogFooter>
                      <Button
                        onClick={() => transfer.mutate({ licenseId: license._id, email: transferEmail })}
                        disabled={!transferEmail || transfer.isPending}
                      >
                        {transfer.isPending ? "Transferring…" : "Confirm transfer"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
