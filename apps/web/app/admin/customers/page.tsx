"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";

interface Customer {
  _id: string;
  name: string;
  email: string;
  created_at: string;
}

export default function CustomersPage() {
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["admin", "customers"],
    queryFn: () => api("/api/admin/customers"),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Customers</h1>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={3} />}
            {customers?.map((c) => (
              <TableRow key={c._id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && customers?.length === 0 && <EmptyState icon={Users} title="No customers yet" description="Customers appear here once someone registers." />}
      </Card>
    </div>
  );
}
