import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_EMAIL, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Tech Love V collects when you use techlovev.in and our WordPress plugins, why, and how to have it deleted.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy covers techlovev.in, its customer dashboard, the license server at tlvapi.techlovev.in, and the WordPress plugins sold
        here. They are run by Eshaan Manchanda, an individual based in India, trading as Tech Love V (&quot;we&quot;, &quot;us&quot;). Questions:{" "}
        <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
      </p>

      <h2>The free plugin</h2>
      <p>
        The free Certificate Generator plugin does not send us anything. Certificates, recipients and settings stay in your own WordPress
        database. It only talks to an email service (such as Sender.net or Mandrill) if you choose one in its settings.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> name, email address and a hashed password (we never see the password itself). If an organization
          is created for you, its name and members.
        </li>
        <li>
          <strong>Licenses:</strong> your license keys, plan, expiry date and the sites they are activated on.
        </li>
        <li>
          <strong>From the Pro plugin:</strong> when a site activates a key, checks it (about twice a day) or checks for updates, it sends
          the license key and the site&apos;s address. We also see the server&apos;s IP address and store it with the activation.
        </li>
        <li>
          <strong>Purchases:</strong> payments are handled by Lemon Squeezy (see below). We receive your email, what you bought, the
          subscription status and renewal dates, never your card details.
        </li>
        <li>
          <strong>Support:</strong> the messages you send us through the dashboard or by email.
        </li>
        <li>
          <strong>Security logs:</strong> administrative actions on licenses (for example an extension or a suspension) are logged with the
          IP address that made them.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <p>
        To run your account, deliver what you paid for, check that a license is valid for a site, offer updates, answer support requests,
        send the emails the service needs (license keys, password resets, renewal reminders), and prevent license abuse. We don&apos;t sell
        your data, show ads or build marketing profiles. The legal basis is the contract with you and our legitimate interest in keeping the
        service secure.
      </p>

      <h2>Services that process data for us</h2>
      <ul>
        <li>
          <strong>Lemon Squeezy</strong> is the merchant of record for purchases: it takes the payment, handles tax and issues your
          receipt, under its own{" "}
          <a href="https://www.lemonsqueezy.com/privacy" target="_blank" rel="noopener noreferrer">
            privacy policy
          </a>
          .
        </li>
        <li>
          <strong>Resend</strong> sends our transactional emails.
        </li>
        <li>
          <strong>Vercel</strong> hosts this website; our API and database run on a virtual server rented from Hostinger.
        </li>
        <li>
          <strong>YouTube</strong> videos on this site load only when you press play, from youtube-nocookie.com.
        </li>
      </ul>
      <p>These providers may store data outside India. We use them only for the purposes above.</p>

      <h2>Cookies</h2>
      <p>
        We set two cookies, <code>access_token</code> and <code>refresh_token</code>, only when you log in, to keep you logged in. There
        are no analytics or advertising cookies. When you open the checkout, Lemon Squeezy may set its own cookies to process the payment
        and prevent fraud.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account, license, support and security data are kept while your account exists, and deleted when you ask us to delete the
        account. Lemon Squeezy keeps billing records as long as tax law requires. A site&apos;s activation record is removed when you
        deactivate that site.
      </p>

      <h2>Your rights</h2>
      <p>
        You can see your licenses and activations in the <Link href="/dashboard">dashboard</Link>. To get a copy of your data, correct it,
        or delete your account, email <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. We reply within 30 days. Deleting your account
        ends your licenses. The same address handles complaints about how we use your data, including under India&apos;s Digital Personal
        Data Protection Act, 2023. If you are in the EU or UK you can also complain to your data protection authority.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, the new version is posted here with a new date. Significant changes are also emailed to customers.</p>
    </LegalPage>
  );
}
