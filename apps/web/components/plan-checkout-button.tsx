"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useUser } from "@/lib/useUser";

// Starts Stripe checkout for any product's plan — the API resolves the price
// from the Plan document, so this works for products added in the admin CMS.
export function PlanCheckoutButton({ product, plan, label, className }: { product: string; plan: string; label: string; className: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useUser();
  const [loading, setLoading] = useState(false);

  async function checkout() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setLoading(true);
    try {
      const { url } = await api<{ url: string }>("/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({ product, plan, billing_cycle: "monthly" }),
      });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start checkout.");
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={checkout} disabled={loading} className={className}>
      {loading ? "Redirecting…" : label}
    </button>
  );
}
