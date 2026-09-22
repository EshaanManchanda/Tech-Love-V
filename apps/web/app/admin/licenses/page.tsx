"use client";

import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";

interface AdminActivation {
  site_url: string;
  activated_at: string;
  expires_at?: string;
}

interface AdminLicense {
  _id: string;
  license_key: string;
  product: "certificate-generator" | "dynamic-tags";
  plan: "pro" | "business" | "paid";
  status: string;
  expires_at: string;
  flagged?: boolean;
  license_type?: "standard" | "trial";
  user_id: { name: string; email: string } | null;
  activations?: AdminActivation[];
}

interface AdminCustomer {
  _id: string;
  name: string;
  email: string;
}

const PLAN_DEFAULT_ACTIVATIONS: Record<"pro" | "business" | "paid", number> = { pro: 1, business: 5, paid: 1 };

function IssueLicenseDialog({ onIssued }: { onIssued: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [product, setProduct] = useState<"certificate-generator" | "dynamic-tags">("certificate-generator");
  const [plan, setPlan] = useState<"pro" | "business" | "paid">("pro");
  const [licenseType, setLicenseType] = useState<"standard" | "trial">("standard");
  const [activationLimit, setActivationLimit] = useState<string>("");
  const [durationDays, setDurationDays] = useState("365");
  const [trialDurationDays, setTrialDurationDays] = useState("180");
  const [certLimit, setCertLimit] = useState("");
  const [bulkCap, setBulkCap] = useState("");
  const [priceNote, setPriceNote] = useState("");

  const { data: customers } = useQuery<AdminCustomer[]>({
    queryKey: ["admin", "customers"],
    queryFn: () => api("/api/admin/customers"),
    enabled: open && mode === "existing",
  });

  const reset = () => {
    setMode("existing");
    setUserId("");
    setName("");
    setEmail("");
    setProduct("certificate-generator");
    setPlan("pro");
    setLicenseType("standard");
    setActivationLimit("");
    setDurationDays("365");
    setTrialDurationDays("180");
    setCertLimit("");
    setBulkCap("");
    setPriceNote("");
  };

  const effectivePlan = product === "dynamic-tags" ? "paid" : licenseType === "trial" ? "business" : plan;

  const issue = useMutation({
    mutationFn: () =>
      api("/api/admin/licenses", {
        method: "POST",
        body: JSON.stringify({
          ...(mode === "existing" ? { user_id: userId } : { email, name }),
          plan: effectivePlan,
          license_type: product === "dynamic-tags" ? "standard" : licenseType,
          activation_limit: activationLimit ? Number(activationLimit) : undefined,
          duration_days: durationDays ? Number(durationDays) : undefined,
          trial_duration_days: licenseType === "trial" ? Number(trialDurationDays) : undefined,
          custom_terms:
            product === "certificate-generator" && plan === "business" && (certLimit || bulkCap || priceNote)
              ? {
                  cert_limit: certLimit ? Number(certLimit) : undefined,
                  bulk_cap: bulkCap ? Number(bulkCap) : undefined,
                  price_note: priceNote || undefined,
                }
              : undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("License issued.");
      onIssued();
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't issue the license."),
  });

  const canSubmit = mode === "existing" ? !!userId : !!email && !!name;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), reset()))}>
      <DialogTrigger asChild>
        <Button size="sm">Issue license</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue license</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <Label htmlFor="issue-product">Product</Label>
          <select
            id="issue-product"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={product}
            onChange={(e) => {
              const next = e.target.value as "certificate-generator" | "dynamic-tags";
              setProduct(next);
              if (next === "dynamic-tags") {
                setLicenseType("standard");
              } else {
                setPlan("pro");
              }
            }}
          >
            <option value="certificate-generator">Certificate Generator</option>
            <option value="dynamic-tags">Dynamic Tags</option>
          </select>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "existing" | "new")}>
          <TabsList>
            <TabsTrigger value="existing">Existing customer</TabsTrigger>
            <TabsTrigger value="new">New customer</TabsTrigger>
          </TabsList>
          <TabsContent value="existing" className="space-y-2">
            <Label htmlFor="issue-customer">Customer</Label>
            <select
              id="issue-customer"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Select a customer…</option>
              {customers?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </TabsContent>
          <TabsContent value="new" className="space-y-3">
            <div>
              <Label htmlFor="issue-name">Name</Label>
              <Input id="issue-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="issue-email">Email</Label>
              <Input id="issue-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">
              We'll create their account and email them a link to set their password, along with the license key.
            </p>
          </TabsContent>
        </Tabs>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="issue-type">Type</Label>
            <select
              id="issue-type"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
              value={product === "dynamic-tags" ? "standard" : licenseType}
              disabled={product === "dynamic-tags"}
              onChange={(e) => setLicenseType(e.target.value as "standard" | "trial")}
            >
              <option value="standard">Standard</option>
              <option value="trial">Trial / Promo (Business, per-site)</option>
            </select>
          </div>
          <div>
            <Label htmlFor="issue-plan">Plan</Label>
            <select
              id="issue-plan"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize disabled:opacity-60"
              value={effectivePlan}
              disabled={product === "dynamic-tags" || licenseType === "trial"}
              onChange={(e) => setPlan(e.target.value as "pro" | "business")}
            >
              {product === "dynamic-tags" ? (
                <option value="paid">Paid</option>
              ) : (
                <>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                </>
              )}
            </select>
          </div>
          <div>
            <Label htmlFor="issue-activation-limit">Activation limit (sites)</Label>
            <Input
              id="issue-activation-limit"
              type="number"
              min={1}
              placeholder={String(PLAN_DEFAULT_ACTIVATIONS[effectivePlan])}
              value={activationLimit}
              onChange={(e) => setActivationLimit(e.target.value)}
              className="mt-1"
            />
          </div>
          {licenseType === "trial" ? (
            <div>
              <Label htmlFor="issue-trial-duration">Trial length (days, per site)</Label>
              <Input
                id="issue-trial-duration"
                type="number"
                min={1}
                value={trialDurationDays}
                onChange={(e) => setTrialDurationDays(e.target.value)}
                className="mt-1"
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="issue-duration">Duration (days)</Label>
              <Input id="issue-duration" type="number" min={1} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className="mt-1" />
            </div>
          )}
        </div>

        {product === "certificate-generator" && licenseType === "standard" && plan === "business" && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">Custom business terms (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="issue-cert-limit">Cert limit / mo</Label>
                <Input id="issue-cert-limit" type="number" min={1} value={certLimit} onChange={(e) => setCertLimit(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="issue-bulk-cap">Bulk cap</Label>
                <Input id="issue-bulk-cap" type="number" min={1} value={bulkCap} onChange={(e) => setBulkCap(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="issue-price-note">Price / billing note</Label>
              <Input
                id="issue-price-note"
                value={priceNote}
                onChange={(e) => setPriceNote(e.target.value)}
                placeholder="e.g. $199/mo, invoiced quarterly"
                className="mt-1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => issue.mutate()} disabled={!canSubmit || issue.isPending}>
            {issue.isPending ? "Issuing…" : "Issue license"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminLicensesPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: licenses, isLoading } = useQuery<AdminLicense[]>({
    queryKey: ["admin", "licenses"],
    queryFn: () => api("/api/admin/licenses"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "licenses"] });

  const extend = useMutation({
    mutationFn: (id: string) => api(`/api/admin/licenses/${id}/extend`, { method: "POST", body: JSON.stringify({ days: 30 }) }),
    onSuccess: () => {
      invalidate();
      toast.success("Extended by 30 days.");
    },
  });
  const disable = useMutation({
    mutationFn: (id: string) => api(`/api/admin/licenses/${id}/disable`, { method: "POST" }),
    onSuccess: invalidate,
  });
  const enable = useMutation({
    mutationFn: (id: string) => api(`/api/admin/licenses/${id}/enable`, { method: "POST" }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Licenses</h1>
        <IssueLicenseDialog onIssued={invalidate} />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={7} />}
            {licenses?.map((l) => (
              <Fragment key={l._id}>
              <TableRow>
                <TableCell>
                  {l.user_id?.name}
                  <div className="text-xs text-muted-foreground">{l.user_id?.email}</div>
                </TableCell>
                <TableCell className="font-mono text-xs">{l.license_key}</TableCell>
                <TableCell className="text-xs">{l.product === "dynamic-tags" ? "Dynamic Tags" : "Certificate Generator"}</TableCell>
                <TableCell className="capitalize">
                  {l.plan}
                  {l.license_type === "trial" && <span className="ml-1 text-xs text-muted-foreground">(trial)</span>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={l.status === "active" ? "seal" : "secondary"} className="uppercase">
                      {l.status}
                    </Badge>
                    {l.flagged && <Badge variant="warning">flagged</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  {l.license_type === "trial" ? (
                    <button
                      type="button"
                      className="underline decoration-dotted underline-offset-2 hover:text-foreground"
                      onClick={() => setExpandedId(expandedId === l._id ? null : l._id)}
                    >
                      {l.activations?.length ?? 0} site{l.activations?.length === 1 ? "" : "s"} — per-site expiry
                    </button>
                  ) : (
                    l.expires_at
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {l.license_type !== "trial" && (
                      <Button variant="outline" size="sm" onClick={() => extend.mutate(l._id)}>
                        +30d
                      </Button>
                    )}
                    {l.status === "active" ? (
                      <Button variant="outline" size="sm" onClick={() => disable.mutate(l._id)}>
                        Disable
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => enable.mutate(l._id)}>
                        Enable
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {l.license_type === "trial" && expandedId === l._id && (
                <TableRow>
                  <TableCell colSpan={7} className="bg-muted/30">
                    {l.activations?.length ? (
                      <div className="space-y-1 py-1 text-xs">
                        {l.activations.map((a) => {
                          const expired = a.expires_at ? new Date(a.expires_at) < new Date() : false;
                          return (
                            <div key={a.site_url} className="flex items-center justify-between gap-4">
                              <span className="font-mono">{a.site_url}</span>
                              <span className={expired ? "text-destructive" : "text-muted-foreground"}>
                                {a.expires_at ? `expires ${new Date(a.expires_at).toISOString().slice(0, 10)}${expired ? " (expired)" : ""}` : "no expiry set"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="py-1 text-xs text-muted-foreground">Not activated on any site yet.</p>
                    )}
                  </TableCell>
                </TableRow>
              )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        {!isLoading && licenses?.length === 0 && (
          <EmptyState icon={KeyRound} title="No licenses yet" description="Licenses appear here once a customer subscribes to a paid plan." />
        )}
      </Card>
    </div>
  );
}
