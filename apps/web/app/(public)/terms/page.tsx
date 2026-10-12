import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_EMAIL, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for buying and using Tech Love V's WordPress plugins and licenses, including Certificate Generator Pro.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms apply when you create an account on techlovev.in or buy a license for one of our paid WordPress plugins, such as
        Certificate Generator Pro. The seller is Eshaan Manchanda, an individual based in India, trading as Tech Love V. Contact:{" "}
        <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
      </p>

      <h2>Payments and Lemon Squeezy</h2>
      <p>
        Our online store is operated by Lemon Squeezy, which is the <strong>merchant of record</strong> for all orders: it takes the
        payment, charges any sales tax or VAT, and issues your receipt. Lemon Squeezy&apos;s{" "}
        <a href="https://www.lemonsqueezy.com/buyer-terms" target="_blank" rel="noopener noreferrer">
          buyer terms
        </a>{" "}
        apply to the payment itself. These terms cover the software and the license.
      </p>

      <h2>What you get</h2>
      <ul>
        <li>
          A license key for the plan you bought. Pro covers 1 site, Business covers 5 sites (or what was agreed in writing). You can move a
          key to another site by deactivating it first.
        </li>
        <li>Updates and support for as long as the license is active.</li>
        <li>
          The plugin code is licensed under the GPL-2.0-or-later. The license key is what gives access to updates, support and
          license-checked features; it is for your own sites and your clients&apos; sites and may not be shared publicly or resold.
        </li>
      </ul>
      <p>
        The free Certificate Generator plugin needs no account or key and stays free. Features and their limits are described on the{" "}
        <Link href="/certificate-generator/pricing">pricing page</Link>.
      </p>

      <h2>Subscriptions, renewal and cancellation</h2>
      <ul>
        <li>Licenses are monthly or yearly subscriptions that renew automatically until you cancel.</li>
        <li>
          You can cancel any time from the billing portal in your <Link href="/dashboard/billing">dashboard</Link>. The license then stays
          active until the end of the period you paid for and is not renewed.
        </li>
        <li>
          When a license ends, Pro features switch off on your sites after the next license check. Certificates you already issued,
          and everything the free plugin does, keep working.
        </li>
        <li>Prices can change for future renewals; we tell you by email before a changed price is charged.</li>
      </ul>

      <h2>Refunds</h2>
      <p>
        See the <Link href="/refund-policy">Refund Policy</Link>: 14 days for a first payment, 7 days for a renewal.
      </p>

      <h2>Fair use</h2>
      <p>
        Don&apos;t try to get around license checks, share keys publicly, overload the license server, or use the plugins for anything
        illegal. We may suspend a license that is abused, after telling you why when we can.
      </p>

      <h2>No warranty and liability</h2>
      <p>
        The plugins are provided &quot;as is&quot;. We work to keep them reliable and secure, but can&apos;t promise they are free of
        errors or fit every purpose. Keep backups of your site. To the extent the law allows, our total liability for any claim is limited
        to what you paid us in the 12 months before it, and we are not liable for indirect losses such as lost profits or data. Nothing
        here limits rights you have under consumer law that can&apos;t be waived.
      </p>

      <h2>Your account</h2>
      <p>
        Keep your login details safe; you are responsible for what is done with your account. You can delete it any time by emailing us
        (this ends your licenses). See the <Link href="/privacy">Privacy Policy</Link> for how we handle your data.
      </p>

      <h2>Changes and law</h2>
      <p>
        We may update these terms; the new version is posted here with a new date, and significant changes are emailed to customers.
        These terms are governed by the laws of India, and the courts of India have jurisdiction, without taking away the protection of
        the consumer laws of the country you live in.
      </p>
    </LegalPage>
  );
}
