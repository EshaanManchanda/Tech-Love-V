import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_EMAIL, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Cancel within 7 days of starting a Tech Love V plugin subscription for a full refund; after that, cancel any time and keep access until the paid period ends.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy">
      <p>
        Paid plugins are subscriptions that renew automatically each month or year until you cancel. If a plugin isn&apos;t right for
        you, you can get your money back at the start. No reason needed.
      </p>

      <h2>Within 7 days: full refund</h2>
      <p>
        Cancel within <strong>7 days</strong> of starting your subscription and we refund the first payment in full.
      </p>

      <h2>After 7 days: cancel any time, no refund</h2>
      <p>
        After the first 7 days, payments, including renewals, aren&apos;t refunded. You can still cancel whenever you like from{" "}
        <strong>Manage billing</strong> in your <Link href="/dashboard/billing">dashboard</Link>: the subscription won&apos;t renew again,
        and you keep using the license until the end of the period you already paid for.
      </p>

      <h2>How to ask for the 7-day refund</h2>
      <p>
        Email <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> from the address you bought with, or reply to your Lemon Squeezy
        receipt. Refunds are issued by Lemon Squeezy, our merchant of record, to your original payment method, usually within 5–10
        business days depending on your bank.
      </p>

      <h2>What happens to the license</h2>
      <p>
        A refunded license is cancelled straight away, and Pro features switch off on your sites after the next license check (within
        about 12 hours). A subscription you cancel without a refund keeps working until its paid period ends. Either way, certificates
        you already issued and the free plugin keep working.
      </p>

      <h2>Exceptions</h2>
      <p>
        We may refuse a refund where there are clear signs of abuse, such as repeated buy-and-refund of the same plugin or a license key
        shared publicly. This doesn&apos;t affect any rights you have under consumer law. See also the <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
