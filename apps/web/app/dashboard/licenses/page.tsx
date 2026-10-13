"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useMyLicenses } from "@/lib/useMyLicenses";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Activation {
  _id: string;
  site_url: string;
  activated_at: string;
  last_check_at: string;
}

interface LicenseWithActivations {
  _id: string;
  license_key: string;
  product?: string;
  plan: string;
  status: string;
  expires_at: string;
  activation_limit: number;
  flagged?: boolean;
  hidden_by_user?: boolean;
  created_at: string;
  activations: Activation[];
}

// Working licenses first, then the ones an admin can still re-enable, then the dead ones.
const STATUS_ORDER = ["active", "suspended", "expired", "cancelled"];
const TABS = ["all", ...STATUS_ORDER];
const TAB_KEY = "licenses-tab";

function byRelevance(a: LicenseWithActivations, b: LicenseWithActivations): number {
  const rank = (s: string) => (STATUS_ORDER.indexOf(s) + 1 || STATUS_ORDER.length + 1);
  return rank(a.status) - rank(b.status) || b.expires_at.localeCompare(a.expires_at) || b.created_at.localeCompare(a.created_at);
}

export default function LicensesPage() {
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [transferEmail, setTransferEmail] = useState("");
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [tab, setTab] = useState("all");
  const [product, setProduct] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      if (saved && TABS.includes(saved)) setTab(saved);
    } catch {
      // storage blocked (private window): just start on "All"
    }
  }, []);
  function chooseTab(value: string) {
    setTab(value);
    try {
      localStorage.setItem(TAB_KEY, value);
    } catch {
      // not remembered; harmless
    }
  }

  const { data: licenses, isLoading, awaitingLicense } = useMyLicenses<LicenseWithActivations>();

  const { data: products } = useQuery<{ slug: string; name: string }[]>({ queryKey: ["products"], queryFn: () => api("/api/products") });
  const productName = (slug = "certificate-generator") => products?.find((p) => p.slug === slug)?.name ?? slug;

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

  const setHidden = useMutation({
    mutationFn: ({ licenseId, hidden }: { licenseId: string; hidden: boolean }) =>
      api(`/api/licenses/${licenseId}/${hidden ? "hide" : "unhide"}`, { method: "POST" }),
    onSuccess: (_data, { hidden }) => {
      invalidate();
      toast.success(hidden ? "License hidden. Find it under “Show hidden” below." : "License restored.");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't update the license."),
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

  const all = [...(licenses ?? [])].sort(byRelevance);
  const productSlugs = [...new Set(all.map((l) => l.product ?? "certificate-generator"))];
  const inProduct = all.filter((l) => !product || (l.product ?? "certificate-generator") === product);
  const visible = inProduct.filter((l) => !l.hidden_by_user);
  const hidden = inProduct.filter((l) => l.hidden_by_user);
  const count = (t: string) => (t === "all" ? visible.length : visible.filter((l) => l.status === t).length);
  const shown = tab === "all" ? visible : visible.filter((l) => l.status === tab);

  function renderLicense(license: LicenseWithActivations) {
    const working = license.status === "active";
    return (
      <Card key={license._id} className={license.hidden_by_user ? "opacity-60" : undefined}>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{productName(license.product)}</span>
            <Badge className="capitalize">{license.plan}</Badge>
            <Badge variant={working ? "seal" : "secondary"} className="uppercase">
              {license.status}
            </Badge>
            {license.flagged && <Badge variant="warning">Flagged for review</Badge>}
          </div>
          <span className="text-sm text-muted-foreground">
            {working ? "Expires" : license.status === "expired" ? "Expired" : "Was valid until"} {license.expires_at}
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
            <span className="break-all">{revealed[license._id] ? license.license_key : "•".repeat(license.license_key.length)}</span>
            <button className="text-xs underline" onClick={() => setRevealed((r) => ({ ...r, [license._id]: !r[license._id] }))}>
              {revealed[license._id] ? "Hide" : "Reveal"}
            </button>
            <button className="text-xs underline" onClick={() => navigator.clipboard.writeText(license.license_key)}>
              Copy
            </button>
          </div>

          {working ? (
            <div>
              <h3 className="text-sm font-medium">
                Activated sites ({license.activations.length}/{license.activation_limit})
              </h3>
              <ul className="mt-2 space-y-2">
                {license.activations.map((a) => (
                  <li key={a._id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="break-all">{a.site_url}</span>
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
          ) : (
            <p className="text-sm text-muted-foreground">
              This license no longer works. It was activated on {license.activations.length} site{license.activations.length === 1 ? "" : "s"}.
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {working && (
              <>
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
              </>
            )}
            {!working && (
              <Button
                variant="outline"
                size="sm"
                disabled={setHidden.isPending}
                onClick={() => setHidden.mutate({ licenseId: license._id, hidden: !license.hidden_by_user })}
              >
                {license.hidden_by_user ? "Unhide" : "Hide license"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Licenses</h1>

      {awaitingLicense && (
        <Card>
          <CardContent className="pt-6 text-sm">
            Payment received — your license is being issued. It appears here within a few seconds; if it hasn&apos;t after a few minutes, contact support.
          </CardContent>
        </Card>
      )}

      {all.length === 0 && !awaitingLicense && (
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

      {all.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={tab} onValueChange={chooseTab} className="max-w-full overflow-x-auto">
            <TabsList>
              {TABS.filter((t) => t === "all" || t === tab || count(t) > 0).map((t) => (
                <TabsTrigger key={t} value={t} className="capitalize">
                  {t} ({count(t)})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {productSlugs.length > 1 && (
            <select
              aria-label="Product"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">All products</option>
              {productSlugs.map((slug) => (
                <option key={slug} value={slug}>
                  {productName(slug)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="space-y-4">
        {shown.map(renderLicense)}
        {all.length > 0 && shown.length === 0 && (
          <p className="text-sm text-muted-foreground">{tab === "all" ? "No licenses to show." : `No ${tab} licenses.`}</p>
        )}
      </div>

      {hidden.length > 0 && (
        <div className="space-y-4">
          <button className="text-sm text-muted-foreground underline" onClick={() => setShowHidden((s) => !s)}>
            {showHidden ? "Collapse" : "Show"} hidden ({hidden.length})
          </button>
          {showHidden && hidden.map(renderLicense)}
        </div>
      )}
    </div>
  );
}
