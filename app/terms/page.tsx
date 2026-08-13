import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service — GADSCALE',
  description: 'The terms that apply when you buy a Google Ads threshold account from GADSCALE.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="14 August 2026">
      <p>
        These terms govern your purchase of Google Ads accounts from GADSCALE (&quot;we&quot;,
        &quot;us&quot;). By placing an order you accept them in full.
      </p>
      <p>
        GADSCALE is operated by <span className="todo">TODO: legal entity name</span>, registered in{' '}
        <span className="todo">TODO: country</span> at{' '}
        <span className="todo">TODO: registered address</span>.
      </p>

      <h2>1. What you are buying</h2>
      <p>
        You are buying access credentials to a Google Ads account on which the billing threshold has
        already been unlocked, together with the recovery details needed to control it. Each account
        is sold once and to a single buyer.
      </p>
      <p>
        You are not buying a service, a managed account, or any guarantee of advertising results.
        What happens to the account after delivery — the campaigns you run, the budget you set, the
        creatives you upload — is entirely your responsibility.
      </p>

      <h2>2. Delivery</h2>
      <p>
        Delivery is digital and automatic. Once your payment is confirmed on the blockchain, we
        email you a download link containing the credentials. The link is valid for 24 hours and can
        be used up to three times. If it expires before you save the file, contact support on
        Telegram and we will issue a new one.
      </p>
      <p>
        Payment confirmation depends on the blockchain, not on us. Bitcoin in particular can take
        well over an hour at busy times.
      </p>

      <h2>3. Your responsibilities</h2>
      <ul>
        <li>
          Change the account password and recovery details immediately after delivery. We cannot be
          held responsible for an account you left on its delivery credentials.
        </li>
        <li>
          Comply with the Google Ads policies. Accounts are suspended for policy violations, and a
          suspension caused by your own campaigns is not covered by our guarantee.
        </li>
        <li>
          Provide a working email address. Delivery goes to the address you enter at checkout.
        </li>
      </ul>

      <h2>4. Replacement guarantee</h2>
      <p>
        Every account is covered by a <strong>24-hour replacement guarantee</strong> running from
        the moment of delivery. If the account is unusable on arrival — you cannot log in, or it is
        already suspended — we replace it free of charge. The full conditions are on the{' '}
        <a href="/refunds">refunds and guarantee page</a>.
      </p>

      <h2>5. Payment</h2>
      <p>
        We accept Bitcoin, Ethereum and USDT only. Prices are shown in US dollars and converted at
        the rate quoted at checkout. Cryptocurrency payments are irreversible: once a transaction is
        confirmed, it cannot be recalled by us or by you.
      </p>
      <p>
        Sending an amount different from the one quoted, or sending on the wrong network, may result
        in the loss of your funds. Always use the address and network shown at checkout.
      </p>

      <h2>6. Limits of our liability</h2>
      <p>
        Our liability is limited, in all cases, to the amount you paid for the order concerned. We
        are not liable for lost advertising spend, lost revenue, lost campaign data, or any indirect
        or consequential loss arising from the use or suspension of an account.
      </p>

      <h2>7. Prohibited use</h2>
      <p>
        You may not use accounts bought from us to advertise illegal goods or services, to conduct
        fraud, or in any way that breaks the law in your jurisdiction. We will cooperate with lawful
        requests from authorities.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these terms. The version in force is the one published on this page at the
        time you place your order.
      </p>

      <h2>9. Governing law and contact</h2>
      <p>
        These terms are governed by the laws of <span className="todo">TODO: jurisdiction</span>.
      </p>
      <p>
        For anything at all, reach us on Telegram at{' '}
        <a href="https://t.me/googleads_now" target="_blank" rel="noopener noreferrer">
          @googleads_now
        </a>
        . It is the fastest and the only channel we monitor continuously.
      </p>
    </LegalPage>
  );
}
