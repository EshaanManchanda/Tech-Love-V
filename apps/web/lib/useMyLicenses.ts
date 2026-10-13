"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

// The payment provider redirects to /dashboard?checkout=success before (or right as) its webhook
// issues the license, so the first fetch often comes back empty. After a checkout we poll until the
// new license shows up. Module-level so the wait survives client-side navigation between dashboard pages.
let checkoutAt: number | null = null;
const POLL_MS = 2_000;
const GIVE_UP_MS = 3 * 60_000;

export function hasNewLicense(licenses: { created_at: string }[] | undefined, since: number): boolean {
  // The webhook can beat the redirect, so a license issued a few minutes before landing counts too.
  return !!licenses?.some((l) => new Date(l.created_at).getTime() >= since - 10 * 60_000);
}

export function useMyLicenses<T extends { created_at: string }>(enabled = true) {
  const [since, setSince] = useState(checkoutAt);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;
    checkoutAt = Date.now();
    setSince(checkoutAt);
    url.searchParams.delete("checkout");
    window.history.replaceState(null, "", url); // a later refresh shouldn't start polling again
  }, []);

  const query = useQuery<T[]>({
    queryKey: ["licenses", "me"],
    queryFn: () => api("/api/licenses/me"),
    enabled,
    refetchInterval: (q) => {
      if (since === null || hasNewLicense(q.state.data, since) || Date.now() - since > GIVE_UP_MS) return false;
      return POLL_MS;
    },
  });

  const awaiting = since !== null && !hasNewLicense(query.data, since) && Date.now() - since <= GIVE_UP_MS;
  if (since !== null && !awaiting) checkoutAt = null;
  return { ...query, awaitingLicense: awaiting };
}
