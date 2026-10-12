"use client";

import Link from "next/link";
import { API_URL } from "@/lib/api";
import { useUser } from "@/lib/useUser";

// Logged-out visitors see the register page, which offers a "skip and download"
// link (the free edition is a public download); a logged-in user just gets the
// free download directly — Pro lives on the dashboard Downloads page.
export function ProductPrimaryCta({ productSlug, registerLabel, className }: { productSlug: string; registerLabel: string; className: string }) {
  const { data: user, isLoading } = useUser();

  if (!isLoading && user) {
    return (
      <a href={`${API_URL}/api/downloads/plugin?product=${productSlug}&edition=free`} className={className}>
        Download free version
      </a>
    );
  }

  return (
    <Link href={`/register?download=${productSlug}`} className={className}>
      {registerLabel}
    </Link>
  );
}
