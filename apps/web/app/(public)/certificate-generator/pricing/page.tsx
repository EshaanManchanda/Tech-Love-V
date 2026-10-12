"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useUser } from "@/lib/useUser";
import { CONTACT_URL, FEATURES, PLANS, type FeatureRow, type PlanCopy } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckoutConsent } from "@/components/legal-page";

interface PlanCompareResponse {
  plans: PlanCopy[];
  features: FeatureRow[];
}

type Cycle = "monthly" | "yearly";

const faqs = [
  { q: "Is the free plugin really unlimited?", a: "Yes. The free Certificate Generator has no caps on certificates, emails, CSV imports or templates, needs no license key and never contacts our license server. You can download it without an account." },
  { q: "What does Pro add?", a: "Pro is a small add-on plugin installed next to the free one. It auto-issues certificates from Tutor LMS, LearnDash, LifterLMS, Sensei LMS, LearnPress and WooCommerce (including past completions), and adds the REST API, custom .ttf font upload, the school bulk ZIP shortcode and priority support." },
  { q: "Do I need the free plugin to use Pro?", a: "Yes. Install and activate Certificate Generator (free) first, then upload the Pro add-on from your dashboard's Downloads page and activate your license key under Settings → License." },
  { q: "How many sites can one license activate?", a: "Pro activates 1 site; Business activates up to 5. Deactivate a site from your dashboard to free up a slot. The free plugin works on any number of sites." },
  { q: "Can I cancel or change my plan anytime?", a: "Yes. Use Manage Billing on your dashboard to open the Stripe billing portal and update or cancel your subscription. If Pro lapses, the free plugin keeps working with all your certificates." },
  { q: "Monthly or yearly?", a: "Pro is $3.5/month or $35/year — the yearly plan is two months free." },
];

function cell(value: boolean | string) {
  if (value === true) return <span className="text-brand-600">✓</span>;
  if (value === false) return <span className="text-slate-300">–</span>;
  return <span className="text-slate-600">{value}</span>;
}

export default function PricingPage() {
  const router = useRouter();
  const { data: user } = useUser();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [loading, setLoading] = useState(false);

  const { data } = useQuery<PlanCompareResponse>({
    queryKey: ["plans", "compare"],
    queryFn: () => api("/api/plans/compare"),
    placeholderData: { plans: PLANS, features: FEATURES },
  });
  // Falls back to local defaults not just while loading, but also if the live
  // catalog comes back empty (e.g. seed-plans.ts hasn't been run against this
  // DB yet) — an empty array is truthy, so `?? PLANS` alone wouldn't catch it.
  const plans = data?.plans?.length ? data.plans : PLANS;
  const features = data?.features?.length ? data.features : FEATURES;

  const pro = plans.find((p) => p.slug === "pro")!;
  const business = plans.find((p) => p.slug === "business")!;
  const free = plans.find((p) => p.slug === "free")!;

  async function subscribePro() {
    if (!user) {
      router.push("/login?next=/certificate-generator/pricing");
      return;
    }
    setLoading(true);
    try {
      const { url } = await api<{ url: string }>("/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({ product: "certificate-generator", plan: "pro", billing_cycle: cycle }),
      });
      window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <Link href="/plugins/certificate-generator" className="text-sm font-medium text-brand-600 hover:underline">← Certificate Generator overview</Link>
      <h1 className="mt-4 text-center font-display text-3xl font-bold text-slate-900">Certificate Generator Plans</h1>
      <p className="mt-2 text-center text-slate-600">Compare Free, Pro, and Business to find the right fit.</p>

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
          Yearly (save ~17%)
        </button>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {/* Free */}
        <Card className="overflow-hidden border-t-4 border-t-emerald-500">
          <CardContent className="pt-6">
            <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Free forever</span>
            <h2 className="mt-3 text-lg font-semibold">{free.label}</h2>
            <p className="mt-2 text-3xl font-bold">$0</p>
            <p className="mt-4 text-sm text-slate-600">No account or license key needed.</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>Unlimited certificates, emails and CSV imports</li>
              <li>Drag-and-drop templates, any-language names, badges and e-signatures</li>
              <li>QR verification, revoke / reissue, bulk ZIP download</li>
            </ul>
            <a href="/register?download=certificate-generator">
              <Button className="mt-6 w-full bg-slate-100 text-slate-900 hover:bg-slate-200">{free.cta.label}</Button>
            </a>
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className="overflow-hidden border-t-4 border-t-indigo-600 shadow-lg shadow-indigo-100 ring-1 ring-indigo-100">
          <CardContent className="pt-6">
            <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">Most popular</span>
            <h2 className="mt-3 text-lg font-semibold">{pro.label}</h2>
            <p className="mt-2 text-3xl font-bold">
              ${cycle === "monthly" ? pro.priceMonthly : pro.priceYearly}
              <span className="text-base font-normal text-slate-500">/{cycle === "monthly" ? "mo" : "yr"}</span>
            </p>
            <p className="mt-4 text-sm text-slate-600">Everything in Free, plus:</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>Auto-issue from Tutor LMS, LearnDash, LifterLMS, Sensei, LearnPress and WooCommerce</li>
              <li>REST API and custom font upload</li>
              <li>1 site · priority support</li>
            </ul>
            <Button onClick={subscribePro} disabled={loading} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700">
              {loading ? "Redirecting…" : pro.cta.label}
            </Button>
              <CheckoutConsent />
          </CardContent>
        </Card>

        {/* Business */}
        <Card className="overflow-hidden border-t-4 border-t-rose-500">
          <CardContent className="pt-6">
            <span className="inline-block rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">Custom</span>
            <h2 className="mt-3 text-lg font-semibold">{business.label}</h2>
            <p className="mt-2 text-2xl font-bold">{business.priceNote}</p>
            <p className="mt-4 text-sm text-slate-600">Everything in Pro on up to 5 sites, with custom terms for agencies and institutions.</p>
            <a href={CONTACT_URL}>
              <Button className="mt-6 w-full bg-slate-100 text-slate-900 hover:bg-slate-200">{business.cta.label}</Button>
            </a>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-2">Feature</th>
              <th className="py-2 text-center">Free</th>
              <th className="py-2 text-center">Pro</th>
              <th className="py-2 text-center">Business</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.key} className="border-b last:border-0">
                <td className="py-2 text-slate-900">{f.label}</td>
                <td className="py-2 text-center">{cell(f.free)}</td>
                <td className="py-2 text-center">{cell(f.pro)}</td>
                <td className="py-2 text-center">{cell(f.business)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="text-center font-display text-2xl font-bold text-slate-900">Billing FAQ</h2>
        <div className="mt-8 space-y-4">
          {faqs.map((f) => (
            <Card key={f.q}>
              <CardContent className="pt-6">
                <h3 className="font-medium text-slate-900">{f.q}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
