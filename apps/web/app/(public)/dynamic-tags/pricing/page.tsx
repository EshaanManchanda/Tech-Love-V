"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useUser } from "@/lib/useUser";
import { DT_FEATURES, DT_PLANS, type DtFeatureRow, type DtPlanCopy } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PlanCompareResponse {
  plans: DtPlanCopy[];
  features: DtFeatureRow[];
}

type Cycle = "monthly" | "yearly";

function cell(value: boolean | string) {
  if (value === true) return <span className="text-brand-600">✓</span>;
  if (value === false) return <span className="text-slate-300">–</span>;
  return <span className="text-slate-600">{value}</span>;
}

export default function DynamicTagsPricingPage() {
  const router = useRouter();
  const { data: user } = useUser();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [loading, setLoading] = useState(false);

  const { data } = useQuery<PlanCompareResponse>({
    queryKey: ["plans", "compare", "dynamic-tags"],
    queryFn: () => api("/api/plans/compare?product=dynamic-tags"),
    placeholderData: { plans: DT_PLANS, features: DT_FEATURES },
  });
  // Falls back to local defaults not just while loading, but also if the live
  // catalog comes back empty (e.g. seed-plans.ts hasn't been run against this
  // DB yet) — an empty array is truthy, so `?? DT_PLANS` alone wouldn't catch it.
  const plans = data?.plans?.length ? data.plans : DT_PLANS;
  const features = data?.features?.length ? data.features : DT_FEATURES;

  const free = plans.find((p) => p.slug === "free")!;
  const paid = plans.find((p) => p.slug === "paid")!;

  async function subscribe() {
    if (!user) {
      router.push("/login?next=/dynamic-tags/pricing");
      return;
    }
    setLoading(true);
    try {
      const { url } = await api<{ url: string }>("/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({ plan: "paid", billing_cycle: cycle }),
      });
      window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/plugins/dynamic-tags" className="text-sm font-medium text-brand-600 hover:underline">← Dynamic Tags overview</Link>
      <h1 className="mt-4 text-center font-display text-3xl font-bold text-slate-900">Dynamic Tags Plans</h1>
      <p className="mt-2 text-center text-slate-600">Free is a complete merge-tag engine on its own. Paid unlocks the full dynamic-data layer.</p>

      <div className="mt-6 flex justify-center gap-2">
        <button
          onClick={() => setCycle("monthly")}
          className={`rounded-md px-3 py-1.5 text-sm ${cycle === "monthly" ? "bg-indigo-600 text-white" : "bg-slate-100"}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setCycle("yearly")}
          className={`rounded-md px-3 py-1.5 text-sm ${cycle === "yearly" ? "bg-indigo-600 text-white" : "bg-slate-100"}`}
        >
          Yearly (save ~21%)
        </button>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Card className="overflow-hidden border-t-4 border-t-emerald-500">
          <CardContent className="pt-6">
            <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Free forever</span>
            <h2 className="mt-3 text-lg font-semibold">{free.label}</h2>
            <p className="mt-2 text-3xl font-bold">$0</p>
            <p className="mt-4 text-sm text-slate-600">Up to 15 dynamic tags, no license key needed.</p>
            <a href="/register">
              <Button className="mt-6 w-full bg-slate-100 text-slate-900 hover:bg-slate-200">{free.cta.label}</Button>
            </a>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-indigo-600 shadow-lg shadow-indigo-100 ring-1 ring-indigo-100">
          <CardContent className="pt-6">
            <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">Unlocks everything</span>
            <h2 className="mt-3 text-lg font-semibold">{paid.label}</h2>
            <p className="mt-2 text-3xl font-bold">
              ${cycle === "monthly" ? paid.priceMonthly : paid.priceYearly}
              <span className="text-base font-normal text-slate-500">/{cycle === "monthly" ? "mo" : "yr"}</span>
            </p>
            <p className="mt-4 text-sm text-slate-600">Unlimited dynamic tags, one site per key.</p>
            <Button onClick={subscribe} disabled={loading} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700">
              {loading ? "Redirecting…" : paid.cta.label}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-2">Feature</th>
              <th className="py-2 text-center">Free</th>
              <th className="py-2 text-center">Paid</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.key} className="border-b last:border-0">
                <td className="py-2 text-slate-900">{f.label}</td>
                <td className="py-2 text-center">{cell(f.free)}</td>
                <td className="py-2 text-center">{cell(f.paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
