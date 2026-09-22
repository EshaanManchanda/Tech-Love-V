"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface Ticket {
  _id: string;
  subject: string;
  category: string;
  status: string;
  updated_at: string;
}

const categories = ["billing", "license", "plugin", "bug", "feature_request", "other"] as const;

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("other");
  const [body, setBody] = useState("");

  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ["support", "tickets"],
    queryFn: () => api("/api/support/tickets"),
  });

  const create = useMutation({
    mutationFn: () => api("/api/support/tickets", { method: "POST", body: JSON.stringify({ subject, category, body }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support", "tickets"] });
      setOpen(false);
      setSubject("");
      setBody("");
      toast.success("Ticket created.");
    },
    onError: () => toast.error("Couldn't create the ticket."),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Support</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New support ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as (typeof categories)[number])}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="body">Message</Label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={!subject || !body || create.isPending}>
                {create.isPending ? "Creating…" : "Create ticket"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {!isLoading && tickets?.length === 0 && (
        <Card>
          <EmptyState
            icon={LifeBuoy}
            title="No tickets yet"
            description="Questions about billing, licenses, or the plugin? Open a ticket and we'll help."
          />
        </Card>
      )}

      <div className="space-y-3">
        {tickets?.map((ticket) => (
          <Link key={ticket._id} href={`/dashboard/support/${ticket._id}`}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="text-xs capitalize text-muted-foreground">{ticket.category.replace("_", " ")}</p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {ticket.status.replace("_", " ")}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
