"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
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

interface FeatureFlag {
  _id: string;
  key: string;
  description?: string;
  enabled: boolean;
  target_type: string;
}

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");

  const { data: flags, isLoading } = useQuery<FeatureFlag[]>({ queryKey: ["admin", "feature-flags"], queryFn: () => api("/api/admin/feature-flags") });

  const create = useMutation({
    mutationFn: () => api("/api/admin/feature-flags", { method: "POST", body: JSON.stringify({ key, description, enabled: false }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
      setOpen(false);
      setKey("");
      setDescription("");
      toast.success("Flag created.");
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api(`/api/admin/feature-flags/${id}/toggle`, { method: "POST", body: JSON.stringify({ enabled }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Feature Flags</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New flag</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New feature flag</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="key">Key</Label>
                <Input id="key" value={key} onChange={(e) => setKey(e.target.value)} className="mt-1" placeholder="beta-dashboard" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={!key || create.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={4} />}
            {flags?.map((f) => (
              <TableRow key={f._id}>
                <TableCell className="font-mono">{f.key}</TableCell>
                <TableCell className="text-muted-foreground">{f.description}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{f.target_type}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant={f.enabled ? "default" : "outline"} size="sm" onClick={() => toggle.mutate({ id: f._id, enabled: !f.enabled })}>
                    {f.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && flags?.length === 0 && (
          <EmptyState icon={Flag} title="No feature flags yet" description="Create one to gradually roll out a new capability." />
        )}
      </Card>
    </div>
  );
}
