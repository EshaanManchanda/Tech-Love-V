"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";

interface AdminProduct {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  status: "active" | "archived";
  plan_count: number;
  current_version: string | null;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function NewProductDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setTagline("");
    setDescription("");
  };

  const create = useMutation({
    mutationFn: () => api("/api/admin/products", { method: "POST", body: JSON.stringify({ name, slug, tagline: tagline || undefined, description: description || undefined }) }),
    onSuccess: () => {
      toast.success("Product created.");
      onCreated();
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't create the product."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), reset()))}>
      <DialogTrigger asChild>
        <Button size="sm">New product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-product-name">Name</Label>
            <Input
              id="new-product-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-product-slug">Slug (used in the public URL)</Label>
            <Input
              id="new-product-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="new-product-tagline">Tagline</Label>
            <Input id="new-product-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="new-product-description">Description</Label>
            <textarea
              id="new-product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={!name || !slug || create.isPending}>
            {create.isPending ? "Creating…" : "Create product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useQuery<AdminProduct[]>({ queryKey: ["admin", "products"], queryFn: () => api("/api/admin/products") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "archived" }) =>
      api(`/api/admin/products/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Products</h1>
        <NewProductDialog onCreated={invalidate} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plans</TableHead>
              <TableHead>Current version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={6} />}
            {products?.map((p) => (
              <TableRow key={p._id}>
                <TableCell>
                  <Link href={`/admin/products/${p._id}`} className="font-medium underline-offset-2 hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                <TableCell>{p.plan_count}</TableCell>
                <TableCell>{p.current_version ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "seal" : "secondary"} className="uppercase">
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href={`/admin/products/${p._id}`}>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
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
        {!isLoading && products?.length === 0 && (
          <EmptyState icon={Package} title="No products yet" description="Create your first product to manage its plans and downloads." />
        )}
      </Card>
    </div>
  );
}
