"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/lib/useUser";
import { PortalShell } from "@/components/portal-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading && user === null) router.push("/login?next=/dashboard");
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return (
    <PortalShell portal="customer" user={user}>
      {children}
    </PortalShell>
  );
}
