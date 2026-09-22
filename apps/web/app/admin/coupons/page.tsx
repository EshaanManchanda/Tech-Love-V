"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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
}

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<Coupon["type"]>("percentage");
  const [value, setValue] = useState("10");

  const { data: coupons, isLoading } = useQuery<Coupon[]>({ queryKey: ["admin", "coupons"], queryFn: () => api("/api/admin/coupons") });

  const create = useMutation({
    mutationFn: () => api("/api/admin/coupons", { method: "POST", body: JSON.stringify({ code, type, value: Number(value) }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      setOpen(false);
      setCode("");
      toast.success("Coupon created.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't create the coupon."),
  });

  const disable = useMutation({
    mutationFn: (id: string) => api(`/api/admin/coupons/${id}/disable`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Coupons</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New coupon</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="code">Code</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="mt-1" placeholder="BLACKFRIDAY" />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as Coupon["type"])}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  <option value="percentage">Percentage off</option>
                  <option value="fixed_amount">Fixed amount off</option>
                </select>
              </div>
              <div>
                <Label htmlFor="value">{type === "percentage" ? "Percent off" : "Amount off (USD)"}</Label>
                <Input id="value" type="number" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={!code || create.isPending}>
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
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Redemptions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={6} />}
            {coupons?.map((c) => (
              <TableRow key={c._id}>
                <TableCell className="font-mono">{c.code}</TableCell>
                <TableCell className="capitalize">{c.type.replace("_", " ")}</TableCell>
                <TableCell>{c.type === "percentage" ? `${c.value}%` : `$${c.value}`}</TableCell>
                <TableCell>
                  {c.redemption_count}
                  {c.max_redemptions ? ` / ${c.max_redemptions}` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant={c.status === "active" ? "success" : "secondary"}>{c.status}</Badge>
                </TableCell>
                <TableCell>
                  {c.status === "active" && (
                    <Button variant="outline" size="sm" onClick={() => disable.mutate(c._id)}>
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
