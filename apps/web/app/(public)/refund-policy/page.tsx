import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_EMAIL, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "14-day money-back guarantee on first payments for Tech Love V plugin licenses, 7 days on renewals.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy">
      <p>
        We want you to be happy with what you bought. If a paid plugin isn&apos;t right for you, you can get your money back. No reason
        needed.
      </p>

      <h2>How long you have</h2>
      <ul>
        <li>
          <strong>First payment:</strong> a full refund within <strong>14 days</strong> of buying.
        </li>
        <li>
          <strong>Renewals:</strong> a full refund of a renewal payment within <strong>7 days</strong> of it being charged, for example if
          you forgot to cancel.
        </li>
      </ul>
      <p>After these periods payments aren&apos;t refunded, but you can cancel any time so the license isn&apos;t renewed again.</p>

      <h2>How to ask</h2>
      <p>
        Email <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> from the address you bought with, or reply to your Lemon Squeezy
        receipt. Refunds are issued by Lemon Squeezy, our merchant of record, to your original payment method, usually within 5–10
        business days depending on your bank.
      </p>

      <h2>What happens to the license</h2>
      <p>
        A refunded license is cancelled. Pro features switch off on your sites after the next license check (within about 12 hours).
        Certificates you already issued, and the free plugin, keep working.
      </p>

      <h2>Exceptions</h2>
      <p>
        We may refuse a refund where there are clear signs of abuse, such as repeated buy-and-refund of the same plugin or a license key
        shared publicly. This doesn&apos;t affect any rights you have under consumer law. See also the <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
