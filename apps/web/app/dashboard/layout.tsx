"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/lib/useUser";
import { PortalShell } from "@/components/portal-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading && user === null) router.push(`/login?next=${encodeURIComponent(pathname)}`);
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) return null;

  return (
    <PortalShell portal="customer" user={user}>
      {children}
    </PortalShell>
  );
}
