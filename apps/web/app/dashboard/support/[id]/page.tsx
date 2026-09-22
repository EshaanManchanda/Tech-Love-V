"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  _id: string;
  sender_role: "customer" | "admin";
  body: string;
  created_at: string;
}

interface TicketDetail {
  ticket: { _id: string; subject: string; status: string; category: string };
  messages: Message[];
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery<TicketDetail>({
    queryKey: ["support", "ticket", id],
    queryFn: () => api(`/api/support/tickets/${id}`),
  });

  const sendReply = useMutation({
    mutationFn: () => api(`/api/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ body: reply }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support", "ticket", id] });
      setReply("");
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{data.ticket.subject}</h1>
        <Badge variant="secondary" className="capitalize">
          {data.ticket.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="space-y-3">
        {data.messages.map((m) => (
          <Card key={m._id} className={m.sender_role === "admin" ? "border-primary/40 bg-primary/5" : undefined}>
            <CardContent className="pt-6">
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{m.sender_role}</p>
              <p className="text-sm">{m.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          placeholder="Write a reply…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button onClick={() => sendReply.mutate()} disabled={!reply || sendReply.isPending}>
          {sendReply.isPending ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </div>
  );
}
