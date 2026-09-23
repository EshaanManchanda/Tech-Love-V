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
  slug: "free" | "pro" | "business" | "paid";
  name: string;
  billing_type: "free" | "recurring" | "contact";
  price_monthly: number | null;
  price_yearly: number | null;
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

function NewPlanDialog({ productId, onCreated }: { productId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<AdminPlan["slug"]>("pro");
  const [name, setName] = useState("");
  const [billingType, setBillingType] = useState<AdminPlan["billing_type"]>("recurring");
  const [priceMonthly, setPriceMonthly] = useState("");
  const [priceYearly, setPriceYearly] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Upgrade");
  const [ctaType, setCtaType] = useState<AdminPlan["cta_type"]>("checkout");

  const reset = () => {
    setSlug("pro");
    setName("");
    setBillingType("recurring");
    setPriceMonthly("");
    setPriceYearly("");
    setCtaLabel("Upgrade");
    setCtaType("checkout");
  };

  const create = useMutation({
    mutationFn: () =>
      api(`/api/admin/products/${productId}/plans`, {
        method: "POST",
        body: JSON.stringify({
          slug,
          name,
          billing_type: billingType,
          price_monthly: priceMonthly ? Number(priceMonthly) : null,
          price_yearly: priceYearly ? Number(priceYearly) : null,
          cert_limit: 0,
          bulk_cap: 0,
          cta_label: ctaLabel,
          cta_type: ctaType,
        }),
      }),
    onSuccess: () => {
      toast.success("Plan added.");
      onCreated();
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't add the plan."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), reset()))}>
      <DialogTrigger asChild>
        <Button size="sm">New plan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="plan-slug">Tier</Label>
            <select
              id="plan-slug"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={slug}
              onChange={(e) => setSlug(e.target.value as AdminPlan["slug"])}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <Label htmlFor="plan-name">Display name</Label>
            <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. Growth" />
          </div>
          <div>
            <Label htmlFor="plan-billing">Billing type</Label>
            <select
              id="plan-billing"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={billingType}
              onChange={(e) => setBillingType(e.target.value as AdminPlan["billing_type"])}
            >
              <option value="free">Free</option>
              <option value="recurring">Recurring</option>
              <option value="contact">Contact us</option>
            </select>
          </div>
          {billingType === "recurring" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="plan-monthly">Price / month</Label>
                <Input id="plan-monthly" type="number" min={0} value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="plan-yearly">Price / year</Label>
                <Input id="plan-yearly" type="number" min={0} value={priceYearly} onChange={(e) => setPriceYearly(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="plan-cta-label">CTA label</Label>
            <Input id="plan-cta-label" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
            {create.isPending ? "Adding…" : "Add plan"}
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
        <NewPlanDialog productId={productId} onCreated={invalidate} />
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
                <TableCell className="capitalize">{p.slug}</TableCell>
                <TableCell>{p.price_monthly != null ? `$${p.price_monthly}/mo` : "—"}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "seal" : "secondary"} className="uppercase">
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.status === "active" ? (
                    <Button variant="outline" size="sm" onClick={() => setStatus.mutate({ id: p._id, status: "archived" })}>
                      Archive
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setStatus.mutate({ id: p._id, status: "active" })}>
                      Activate
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
