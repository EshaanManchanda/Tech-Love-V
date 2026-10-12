import Link from "next/link";

// Shared shell for /privacy, /terms and /refund-policy: plain prose, styled
// through child selectors since the site has no typography plugin.
export const LEGAL_UPDATED = "12 October 2026";
export const LEGAL_EMAIL = "techlovev@gmail.com";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-slate-700 [&_a]:text-brand-600 [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_li]:mt-1 [&_p]:mt-4 [&_strong]:text-slate-900 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="font-display text-3xl font-bold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">Last updated: {LEGAL_UPDATED}</p>
      {children}
    </main>
  );
}

/** Under every Subscribe button: what the buyer agrees to and who takes the payment. */
export function CheckoutConsent() {
  return (
    <p className="mt-2 text-center text-xs text-slate-500">
      By subscribing you agree to the{" "}
      <Link href="/terms" className="underline hover:text-slate-900">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/refund-policy" className="underline hover:text-slate-900">
        Refund Policy
      </Link>
      . Payments are processed by Lemon Squeezy.
    </p>
  );
}
