"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/price";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";

interface Coupon {
  _id: string;
  code: string;
  type: "percentage" | "fixed_amount" | "free_trial" | "free_months";
  value: number;
  status: "active" | "disabled";
  redemption_count: number;
  max_redemptions?: number;
  expires_at?: string;
  applicable_plans: string[];
  ls_discount_code?: string;
}

interface CouponPlan {
  slug: string;
  name: string;
  product: string;
  ready: boolean;
}

// Creating a coupon also creates the matching discount code in Lemon Squeezy, limited to the
// chosen plans, so the code works whether it's passed from our pricing page or typed at checkout.
const TYPES: { value: Coupon["type"]; label: string; valueLabel: string }[] = [
  { value: "percentage", label: "Percentage off the first payment", valueLabel: "Percent off" },
  { value: "fixed_amount", label: "Fixed amount off the first payment", valueLabel: "Amount off (₹)" },
  { value: "free_months", label: "Free months", valueLabel: "Number of free months" },
];

function describe(c: Coupon): string {
  if (c.type === "percentage") return `${c.value}% off`;
  if (c.type === "fixed_amount") return `${formatPrice(c.value)} off`;
  if (c.type === "free_months") return `${c.value} month${c.value === 1 ? "" : "s"} free`;
  return `${c.value}-day trial`;
}

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<Coupon["type"]>("percentage");
  const [value, setValue] = useState("10");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [chosenPlans, setChosenPlans] = useState<string[] | null>(null); // null = every plan that's ready

  const { data: coupons, isLoading } = useQuery<Coupon[]>({ queryKey: ["admin", "coupons"], queryFn: () => api("/api/admin/coupons") });
  const { data: plans } = useQuery<CouponPlan[]>({ queryKey: ["admin", "coupons", "plans"], queryFn: () => api("/api/admin/coupons/plans") });

  const readySlugs = [...new Set((plans ?? []).filter((p) => p.ready).map((p) => p.slug))];
  const selected = chosenPlans ?? readySlugs;
  const toggle = (slug: string) => setChosenPlans(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);

  function reset() {
    setCode("");
    setType("percentage");
    setValue("10");
    setMaxRedemptions("");
    setExpiresOn("");
    setChosenPlans(null);
  }

  const create = useMutation({
    mutationFn: () =>
      api("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
          code,
          type,
          value: Number(value),
          applicable_plans: selected,
          ...(maxRedemptions ? { max_redemptions: Number(maxRedemptions) } : {}),
          // End of the chosen day, in India time.
          ...(expiresOn ? { expires_at: new Date(`${expiresOn}T23:59:59+05:30`).toISOString() } : {}),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      setOpen(false);
      reset();
      toast.success("Coupon created, in Lemon Squeezy too.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't create the coupon."),
  });

  const disable = useMutation({
    mutationFn: (id: string) => api(`/api/admin/coupons/${id}/disable`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toast.success("Coupon disabled.");
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toast.error(err instanceof Error ? err.message : "Couldn't disable the coupon.");
    },
  });

  const typeInfo = TYPES.find((t) => t.value === type) ?? TYPES[0];
  const valid = !!code && Number(value) > 0 && (type !== "percentage" || Number(value) <= 100) && selected.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Coupons</h1>
        <Dialog open={open} onOpenChange={(o) => (setOpen(o), o || reset())}>
          <DialogTrigger asChild>
            <Button>New coupon</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  className="mt-1 font-mono"
                  placeholder="DIWALI20"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as Coupon["type"])}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="value">{typeInfo.valueLabel}</Label>
                <Input id="value" type="number" min={1} max={type === "percentage" ? 100 : undefined} value={value} onChange={(e) => setValue(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Applies to</Label>
                <div className="mt-1 space-y-1.5 rounded-md border border-input p-3">
                  {plans?.length === 0 && <p className="text-sm text-muted-foreground">No paid plans yet.</p>}
                  {plans?.map((p) => (
                    <label key={`${p.product}:${p.slug}`} className={`flex items-center gap-2 text-sm ${p.ready ? "" : "text-muted-foreground"}`}>
                      <input type="checkbox" checked={selected.includes(p.slug)} disabled={!p.ready} onChange={() => toggle(p.slug)} />
                      {p.product} — {p.name}
                      {!p.ready && <span className="text-xs">(no Lemon Squeezy variant yet)</span>}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="max">Max uses (optional)</Label>
                  <Input id="max" type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} className="mt-1" placeholder="Unlimited" />
                </div>
                <div>
                  <Label htmlFor="expires">Expires (optional)</Label>
                  <Input id="expires" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={!valid || create.isPending}>
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Plans</TableHead>
              <TableHead>Redemptions</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={7} />}
            {coupons?.map((c) => (
              <TableRow key={c._id}>
                <TableCell className="font-mono">{c.code}</TableCell>
                <TableCell>{describe(c)}</TableCell>
                <TableCell className="text-sm">{c.applicable_plans.join(", ")}</TableCell>
                <TableCell>
                  {c.redemption_count}
                  {c.max_redemptions ? ` / ${c.max_redemptions}` : ""}
                </TableCell>
                <TableCell className="text-sm">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-IN") : "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "active" ? "success" : "secondary"}>{c.status}</Badge>
                </TableCell>
                <TableCell>
                  {c.status === "active" && (
                    <Button variant="outline" size="sm" onClick={() => disable.mutate(c._id)} disabled={disable.isPending}>
                      Disable
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && coupons?.length === 0 && (
          <EmptyState icon={Ticket} title="No coupons yet" description="Create a coupon to offer a discount at checkout." />
        )}
      </Card>
    </div>
  );
}
