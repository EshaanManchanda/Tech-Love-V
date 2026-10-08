"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, apiUpload, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";

interface AdminProduct {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  status: "active" | "archived";
}

interface AdminPlan {
  _id: string;
  slug: string;
  name: string;
  billing_type: "free" | "recurring" | "contact";
  price_monthly: number | null;
  price_yearly: number | null;
  activation_limit?: number;
  stripe_price_monthly?: string;
  stripe_price_yearly?: string;
  license_key_prefix?: string;
  cta_label: string;
  cta_type: "register" | "checkout" | "contact";
  status: "active" | "archived";
}

interface AdminVersion {
  _id: string;
  version: string;
  changelog?: string;
  zip_filename: string;
  file_size: number;
  released_at: string;
  is_current: boolean;
}

function DetailsTab({ product, onSaved }: { product: AdminProduct; onSaved: () => void }) {
  const [name, setName] = useState(product.name);
  const [tagline, setTagline] = useState(product.tagline ?? "");
  const [description, setDescription] = useState(product.description ?? "");

  const save = useMutation({
    mutationFn: () => api(`/api/admin/products/${product._id}`, { method: "PATCH", body: JSON.stringify({ name, tagline, description }) }),
    onSuccess: () => {
      toast.success("Saved.");
      onSaved();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't save."),
  });

  return (
    <Card>
      <CardContent className="max-w-lg space-y-3 pt-6">
        <div>
          <Label htmlFor="detail-name">Name</Label>
          <Input id="detail-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Slug</Label>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{product.slug} (fixed — used in the public URL)</p>
        </div>
        <div>
          <Label htmlFor="detail-tagline">Tagline</Label>
          <Input id="detail-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="detail-description">Description</Label>
          <textarea
            id="detail-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button onClick={() => save.mutate()} disabled={!name || save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

const CTA_FOR_BILLING: Record<AdminPlan["billing_type"], AdminPlan["cta_type"]> = { free: "register", recurring: "checkout", contact: "contact" };

// Create a plan, or edit one when `plan` is given. Paid plans carry everything
// licensing needs — activation limit, Stripe price ids and the key prefix — so
// a brand-new product can be sold and licensed without a code change.
function PlanDialog({ productId, plan, onSaved }: { productId: string; plan?: AdminPlan; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const initial = () => ({
    slug: plan?.slug ?? "",
    name: plan?.name ?? "",
    billingType: plan?.billing_type ?? ("recurring" as AdminPlan["billing_type"]),
    priceMonthly: plan?.price_monthly?.toString() ?? "",
    priceYearly: plan?.price_yearly?.toString() ?? "",
    activationLimit: plan?.activation_limit ? String(plan.activation_limit) : "1",
    stripeMonthly: plan?.stripe_price_monthly ?? "",
    stripeYearly: plan?.stripe_price_yearly ?? "",
    keyPrefix: plan?.license_key_prefix ?? "",
    ctaLabel: plan?.cta_label ?? "Subscribe",
  });
  const [form, setForm] = useState(initial);
  const set = (key: keyof ReturnType<typeof initial>) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const paid = form.billingType !== "free";

  const save = useMutation({
    mutationFn: () =>
      api(`/api/admin/products/${productId}/plans${plan ? `/${plan._id}` : ""}`, {
        method: plan ? "PATCH" : "POST",
        body: JSON.stringify({
          ...(plan ? {} : { slug: form.slug.trim().toLowerCase(), cert_limit: 0, bulk_cap: 0 }),
          name: form.name,
          billing_type: form.billingType,
          price_monthly: form.priceMonthly ? Number(form.priceMonthly) : null,
          price_yearly: form.priceYearly ? Number(form.priceYearly) : null,
          activation_limit: paid ? Number(form.activationLimit) || 1 : 0,
          stripe_price_monthly: form.stripeMonthly.trim() || undefined,
          stripe_price_yearly: form.stripeYearly.trim() || undefined,
          license_key_prefix: form.keyPrefix.trim(),
          cta_label: form.ctaLabel,
          cta_type: CTA_FOR_BILLING[form.billingType],
        }),
      }),
    onSuccess: () => {
      toast.success(plan ? "Plan saved." : "Plan added.");
      onSaved();
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't save the plan."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (setOpen(o), o && setForm(initial()))}>
      <DialogTrigger asChild>
        {plan ? <Button variant="outline" size="sm">Edit</Button> : <Button size="sm">New plan</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? `Edit ${plan.name}` : "New plan"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="plan-slug">Slug</Label>
              <Input id="plan-slug" value={form.slug} onChange={set("slug")} disabled={!!plan} className="mt-1 font-mono" placeholder="e.g. pro" />
            </div>
            <div>
              <Label htmlFor="plan-name">Display name</Label>
              <Input id="plan-name" value={form.name} onChange={set("name")} className="mt-1" placeholder="e.g. Pro" />
            </div>
          </div>
          <div>
            <Label htmlFor="plan-billing">Billing type</Label>
            <select id="plan-billing" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.billingType} onChange={set("billingType")}>
              <option value="free">Free (no license key)</option>
              <option value="recurring">Recurring (Stripe checkout)</option>
              <option value="contact">Contact us (licenses issued by admin)</option>
            </select>
          </div>
          {form.billingType === "recurring" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="plan-monthly">Price / month</Label>
                  <Input id="plan-monthly" type="number" min={0} step="0.01" value={form.priceMonthly} onChange={set("priceMonthly")} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="plan-yearly">Price / year</Label>
                  <Input id="plan-yearly" type="number" min={0} step="0.01" value={form.priceYearly} onChange={set("priceYearly")} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="plan-stripe-monthly">Stripe price id (monthly)</Label>
                  <Input id="plan-stripe-monthly" value={form.stripeMonthly} onChange={set("stripeMonthly")} className="mt-1 font-mono text-xs" placeholder="price_…" />
                </div>
                <div>
                  <Label htmlFor="plan-stripe-yearly">Stripe price id (yearly)</Label>
                  <Input id="plan-stripe-yearly" value={form.stripeYearly} onChange={set("stripeYearly")} className="mt-1 font-mono text-xs" placeholder="price_…" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Checkout stays disabled for a billing cycle until its Stripe price id is set.</p>
            </>
          )}
          {paid && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="plan-activations">Sites per license</Label>
                <Input id="plan-activations" type="number" min={1} value={form.activationLimit} onChange={set("activationLimit")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="plan-prefix">License key prefix</Label>
                <Input id="plan-prefix" value={form.keyPrefix} onChange={set("keyPrefix")} maxLength={6} className="mt-1 font-mono uppercase" placeholder="from product initials" />
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="plan-cta-label">Button label</Label>
            <Input id="plan-cta-label" value={form.ctaLabel} onChange={set("ctaLabel")} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!form.name || !form.slug || save.isPending}>
            {save.isPending ? "Saving…" : plan ? "Save plan" : "Add plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlansTab({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useQuery<AdminPlan[]>({
    queryKey: ["admin", "products", productId, "plans"],
    queryFn: () => api(`/api/admin/products/${productId}/plans`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "products", productId, "plans"] });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "archived" }) =>
      api(`/api/admin/products/${productId}/plans/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PlanDialog productId={productId} onSaved={invalidate} />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={5} />}
            {plans?.map((p) => (
              <TableRow key={p._id}>
                <TableCell>{p.name}</TableCell>
                <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                <TableCell>{p.price_monthly != null ? `$${p.price_monthly}/mo` : "—"}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "seal" : "secondary"} className="uppercase">
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <PlanDialog productId={productId} plan={p} onSaved={invalidate} />
                    {p.status === "active" ? (
                      <Button variant="outline" size="sm" onClick={() => setStatus.mutate({ id: p._id, status: "archived" })}>
                        Archive
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setStatus.mutate({ id: p._id, status: "active" })}>
                        Activate
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function UploadVersionDialog({ productId, onUploaded }: { productId: string; onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isCurrent, setIsCurrent] = useState(true);

  const reset = () => {
    setVersion("");
    setChangelog("");
    setFile(null);
    setIsCurrent(true);
  };

  const upload = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.set("version", version);
      formData.set("changelog", changelog);
      formData.set("is_current", String(isCurrent));
      formData.set("file", file!);
      return apiUpload(`/api/admin/products/${productId}/versions`, formData);
    },
    onSuccess: () => {
      toast.success("Version uploaded.");
      onUploaded();
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't upload the version."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), reset()))}>
      <DialogTrigger asChild>
        <Button size="sm">Upload version</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a new version</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="version-label">Version label</Label>
            <Input id="version-label" value={version} onChange={(e) => setVersion(e.target.value)} className="mt-1" placeholder="e.g. 7.6.0" />
          </div>
          <div>
            <Label htmlFor="version-changelog">Changelog</Label>
            <textarea
              id="version-changelog"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="version-file">Plugin .zip</Label>
            <input
              id="version-file"
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} />
            Make this the current download
          </label>
        </div>
        <DialogFooter>
          <Button onClick={() => upload.mutate()} disabled={!version || !file || upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VersionsTab({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const { data: versions, isLoading } = useQuery<AdminVersion[]>({
    queryKey: ["admin", "products", productId, "versions"],
    queryFn: () => api(`/api/admin/products/${productId}/versions`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "products", productId, "versions"] });
  const setCurrent = useMutation({
    mutationFn: (versionId: string) => api(`/api/admin/products/${productId}/versions/${versionId}/set-current`, { method: "PATCH" }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <UploadVersionDialog productId={productId} onUploaded={invalidate} />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Changelog</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Released</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={5} />}
            {versions?.map((v) => (
              <TableRow key={v._id}>
                <TableCell className="font-mono text-xs">
                  {v.version} {v.is_current && <Badge variant="seal" className="ml-2">current</Badge>}
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{v.changelog}</TableCell>
                <TableCell>{(v.file_size / 1024 / 1024).toFixed(1)} MB</TableCell>
                <TableCell>{new Date(v.released_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {!v.is_current && (
                    <Button variant="outline" size="sm" onClick={() => setCurrent.mutate(v._id)}>
                      Make current
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function AdminProductDetailPage({ params }: { params: { id: string } }) {
  const { data: product, isLoading, refetch } = useQuery<AdminProduct>({
    queryKey: ["admin", "products", params.id],
    queryFn: () => api(`/api/admin/products/${params.id}`),
  });

  if (isLoading || !product) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Products
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold">{product.name}</h1>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4">
          <DetailsTab product={product} onSaved={refetch} />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          <PlansTab productId={product._id} />
        </TabsContent>
        <TabsContent value="versions" className="mt-4">
          <VersionsTab productId={product._id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
