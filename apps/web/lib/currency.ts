"use client";

import { useEffect, useState } from "react";

// Buyers choose USD or INR on the pricing pages. Lemon Squeezy charges USD either way;
// INR picks an India-priced variant (see apps/api config/plans.ts priceIdFor).
export type Currency = "usd" | "inr";

const STORAGE_KEY = "tlv_currency";

function stored(): Currency | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "usd" || value === "inr" ? value : null;
  } catch {
    return null;
  }
}

/**
 * The visitor's currency: their own earlier choice, else INR for visitors in India
 * (Vercel's geo header via /api/geo), else USD.
 */
export function useCurrency(): [Currency, (currency: Currency) => void] {
  const [currency, setCurrency] = useState<Currency>("usd");

  useEffect(() => {
    const saved = stored();
    if (saved) {
      setCurrency(saved);
      return;
    }
    let cancelled = false;
    fetch("/api/geo")
      .then((res) => (res.ok ? res.json() : null))
      .then((geo: { country: string | null } | null) => {
        if (!cancelled && geo?.country === "IN") setCurrency("inr");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function choose(next: Currency) {
    setCurrency(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode etc.: the choice just isn't remembered.
    }
  }

  return [currency, choose];
}

export function formatPrice(amount: number, currency: Currency): string {
  return currency === "inr" ? `₹${amount.toLocaleString("en-IN")}` : `$${amount}`;
}
