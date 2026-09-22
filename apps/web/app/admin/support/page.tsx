"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";

interface AdminTicket {
  _id: string;
  subject: string;
  category: string;
  status: string;
  updated_at: string;
  user_id: { name: string; email: string } | null;
}

export default function AdminSupportPage() {
  const { data: tickets, isLoading } = useQuery<AdminTicket[]>({
    queryKey: ["admin", "support", "tickets"],
    queryFn: () => api("/api/support/tickets"),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Support</h1>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={5} />}
            {tickets?.map((t) => (
              <TableRow key={t._id}>
                <TableCell>
                  <Link href={`/admin/support/${t._id}`} className="font-medium underline-offset-2 hover:underline">
                    {t.subject}
                  </Link>
                </TableCell>
                <TableCell>{t.user_id?.name}</TableCell>
                <TableCell className="capitalize">{t.category.replace("_", " ")}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {t.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(t.updated_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && tickets?.length === 0 && <EmptyState icon={LifeBuoy} title="No tickets" description="Customer support requests will show up here." />}
      </Card>
    </div>
  );
}
