"use client";

import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";

interface AuditLogEntry {
  _id: string;
  actor_id: { name: string; email: string } | null;
  action: string;
  resource: string;
  resource_id: string;
  created_at: string;
}

export default function AdminLogsPage() {
  const { data: logs, isLoading } = useQuery<AuditLogEntry[]>({ queryKey: ["admin", "logs"], queryFn: () => api("/api/admin/logs") });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Audit Logs</h1>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows cols={4} />}
            {logs?.map((l) => (
              <TableRow key={l._id}>
                <TableCell className="text-sm text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell>{l.actor_id?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono">
                    {l.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.resource} · {l.resource_id}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && logs?.length === 0 && <EmptyState icon={ScrollText} title="No activity yet" description="Admin actions like extending or disabling a license will appear here." />}
      </Card>
    </div>
  );
}
