"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface Organization {
  _id: string;
  name: string;
  role: string;
  member_count: number;
}

interface ApiKey {
  _id: string;
  name: string;
  key_prefix: string;
  created_at: string;
}

function TeamTab() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: orgs } = useQuery<Organization[]>({ queryKey: ["organizations"], queryFn: () => api("/api/organizations") });
  const primaryOrg = orgs?.[0];

  const invite = useMutation({
    mutationFn: () =>
      api(`/api/organizations/${primaryOrg?._id}/members`, { method: "POST", body: JSON.stringify({ email: inviteEmail, role: "developer" }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setInviteEmail("");
      toast.success("Member added.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't add that member."),
  });

  if (!primaryOrg) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div>
          <p className="font-medium">{primaryOrg.name}</p>
          <p className="text-sm text-muted-foreground">
            {primaryOrg.member_count} member{primaryOrg.member_count === 1 ? "" : "s"} · your role: {primaryOrg.role}
          </p>
        </div>
        {primaryOrg.role === "owner" && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="invite-email">Invite by email</Label>
              <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={() => invite.mutate()} disabled={!inviteEmail || invite.isPending}>
              Invite
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Invited members must already have a Certificate Generator account.</p>
      </CardContent>
    </Card>
  );
}

function ApiKeysTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const { data: keys } = useQuery<ApiKey[]>({ queryKey: ["api-keys"], queryFn: () => api("/api/api-keys") });

  const create = useMutation({
    mutationFn: () => api<{ key: string }>("/api/api-keys", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setJustCreated(res.key);
      setName("");
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api(`/api/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {justCreated && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-medium">Copy this key now — it won't be shown again:</p>
            <code className="mt-1 block break-all">{justCreated}</code>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="key-name">New key name</Label>
            <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. CI" />
          </div>
          <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
            Create key
          </Button>
        </div>

        <div className="space-y-2">
          {keys?.map((k) => (
            <div key={k._id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{k.key_prefix}…</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => revoke.mutate(k._id)}>
                Revoke
              </Button>
            </div>
          ))}
          {keys?.length === 0 && <EmptyState icon={KeyRound} title="No API keys yet" description="Create one above when you need programmatic access." />}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>
        <TabsContent value="team">
          <TeamTab />
        </TabsContent>
        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>
      </Tabs>
      <Badge variant="outline" className="text-xs font-normal">
        API keys are groundwork for a future developer program — not required for normal use.
      </Badge>
    </div>
  );
}
