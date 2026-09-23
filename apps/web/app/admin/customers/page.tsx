"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
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

interface Customer {
  _id: string;
  name: string;
  email: string;
  status: "active" | "disabled";
  created_at: string;
}

type PasswordMode = "email_link" | "set_password";

function PasswordModeFields({
  mode,
  setMode,
  password,
  setPassword,
}: {
  mode: PasswordMode;
  setMode: (m: PasswordMode) => void;
  password: string;
  setPassword: (p: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Password</Label>
      <select
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={mode}
        onChange={(e) => setMode(e.target.value as PasswordMode)}
      >
        <option value="email_link">Email a set-password link</option>
        <option value="set_password">Set a password directly</option>
      </select>
      {mode === "set_password" ? (
        <Input type="text" placeholder="Temporary password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
      ) : (
        <p className="text-xs text-muted-foreground">They'll get an email with a link to choose their own password.</p>
      )}
    </div>
  );
}

function NewCustomerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<PasswordMode>("email_link");
  const [password, setPassword] = useState("");

  const reset = () => {
    setName("");
    setEmail("");
    setMode("email_link");
    setPassword("");
  };

  const create = useMutation({
    mutationFn: () => api("/api/admin/customers", { method: "POST", body: JSON.stringify({ name, email, mode, password: mode === "set_password" ? password : undefined }) }),
    onSuccess: () => {
      toast.success("Customer created.");
      onCreated();
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't create the customer."),
  });

  const canSubmit = !!name && !!email && (mode === "email_link" || password.length >= 8);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), reset()))}>
      <DialogTrigger asChild>
        <Button size="sm">New customer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-cust-name">Name</Label>
            <Input id="new-cust-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="new-cust-email">Email</Label>
            <Input id="new-cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <PasswordModeFields mode={mode} setMode={setMode} password={password} setPassword={setPassword} />
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={!canSubmit || create.isPending}>
            {create.isPending ? "Creating…" : "Create customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCustomerDialog({ customer, onSaved }: { customer: Customer; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);

  const save = useMutation({
    mutationFn: () => api(`/api/admin/customers/${customer._id}`, { method: "PATCH", body: JSON.stringify({ name, email }) }),
    onSuccess: () => {
      toast.success("Customer updated.");
      onSaved();
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't update the customer."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="edit-cust-name">Name</Label>
            <Input id="edit-cust-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="edit-cust-email">Email</Label>
            <Input id="edit-cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={(!name.trim() && !email.trim()) || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PasswordMode>("email_link");
  const [password, setPassword] = useState("");

  const reset = useMutation({
    mutationFn: () =>
      api(`/api/admin/customers/${customer._id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ mode, password: mode === "set_password" ? password : undefined }),
      }),
    onSuccess: (data: unknown) => {
      toast.success((data as { message?: string })?.message ?? "Done.");
      setOpen(false);
      setPassword("");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't reset the password."),
  });

  const canSubmit = mode === "email_link" || password.length >= 8;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {customer.name}</DialogTitle>
        </DialogHeader>
        <PasswordModeFields mode={mode} setMode={setMode} password={password} setPassword={setPassword} />
        <DialogFooter>
          <Button onClick={() => reset.mutate()} disabled={!canSubmit || reset.isPending}>
            {reset.isPending ? "Submitting…" : "Reset password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "active" | "disabled">("");

  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (status) params.set("status", status);
  const queryString = params.toString();

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["admin", "customers", queryString],
    queryFn: () => api(`/api/admin/customers${queryString ? `?${queryString}` : ""}`),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });

  const deactivate = useMutation({
    mutationFn: (id: string) => api(`/api/admin/customers/${id}/deactivate`, { method: "POST" }),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't deactivate the customer."),
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => api(`/api/admin/customers/${id}/reactivate`, { method: "POST" }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Customers</h1>
        <NewCustomerDialog onCreated={invalidate} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | "active" | "disabled")}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={5} />}
            {customers?.map((c) => (
              <TableRow key={c._id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "active" ? "seal" : "secondary"} className="uppercase">
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <EditCustomerDialog customer={c} onSaved={invalidate} />
                    <ResetPasswordDialog customer={c} />
                    {c.status === "active" ? (
                      <Button variant="outline" size="sm" onClick={() => deactivate.mutate(c._id)}>
                        Deactivate
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => reactivate.mutate(c._id)}>
                        Reactivate
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && customers?.length === 0 && <EmptyState icon={Users} title="No customers found" description="Try a different search, or create one." />}
      </Card>
    </div>
  );
}
