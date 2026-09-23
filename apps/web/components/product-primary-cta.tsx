"use client";

import Link from "next/link";
import { API_URL } from "@/lib/api";
import { useUser } from "@/lib/useUser";

// Logged-out visitors go through registration as before; a logged-in user
// already has an account, so the same button downloads the current version
// directly instead — matches the dashboard Downloads page's own link
// (apps/web/app/dashboard/downloads/page.tsx), which needs no plan check
// either (installation is free on every plan; only activation is gated).
export function ProductPrimaryCta({ productSlug, registerLabel, className }: { productSlug: string; registerLabel: string; className: string }) {
  const { data: user, isLoading } = useUser();

  if (!isLoading && user) {
    return (
      <a href={`${API_URL}/api/downloads/plugin?product=${productSlug}`} className={className}>
        Download latest version
      </a>
    );
  }

  return (
    <Link href="/register" className={className}>
      {registerLabel}
    </Link>
  );
}
