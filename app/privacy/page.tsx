import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — GADSCALE',
  description: 'What data GADSCALE collects when you buy, why, and how long it is kept.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="14 August 2026">
      <p>
        We collect as little as possible. There is no account to create, no password to choose, and
        no tracking of you across other websites.
      </p>
      <p>
        The data controller is <span className="todo">TODO: legal entity name</span>, registered in{' '}
        <span className="todo">TODO: country</span> at{' '}
        <span className="todo">TODO: registered address</span>. For any question about your data,
        write to <span className="todo">TODO: contact email</span>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your email address</strong>, which you enter at checkout. It is the only way to
          deliver your credentials and the only way to prove an order is yours.
        </li>
        <li>
          <strong>Your order details</strong>: product, quantity, amount, cryptocurrency used,
          transaction identifier, and status.
        </li>
        <li>
          <strong>A Telegram username</strong>, but only if you choose to join a restock waiting
          list.
        </li>
        <li>
          <strong>Technical data</strong> needed to run the site securely: your IP address is used
          to rate-limit abusive requests. It is not stored alongside your order.
        </li>
      </ul>
      <p>
        We never see your payment details. Cryptocurrency payments are processed by NOWPayments; we
        receive only the confirmation and the transaction reference.
      </p>

      <h2>Why we hold it</h2>
      <p>
        To deliver what you bought, to let you retrieve your credentials later, to honour the
        replacement guarantee, to prevent fraud and abuse, and to meet accounting obligations. We do
        not build advertising profiles and we do not sell data.
      </p>

      <h2>Who else sees it</h2>
      <ul>
        <li>
          <strong>Resend</strong> — sends the delivery and access-code emails, and therefore
          processes your email address.
        </li>
        <li>
          <strong>NOWPayments</strong> — processes the cryptocurrency payment.
        </li>
        <li>
          <strong>Vercel and Neon</strong> — host the site and the database.
        </li>
        <li>
          <strong>Sentry</strong> — receives technical error reports, which may incidentally contain
          an order identifier.
        </li>
      </ul>
      <p>That is the full list. We disclose data to authorities only where legally compelled.</p>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept for{' '}
        <span className="todo">TODO: retention period, e.g. 5 years</span> to satisfy accounting
        obligations. Download links and their tokens expire after 24 hours. Access codes expire
        after 10 minutes and are deleted within a day. Waiting-list entries are deleted once you
        have been notified, or on request.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us for a copy of your data, to correct it, to delete it, or to restrict how we
        use it. Write to <span className="todo">TODO: contact email</span> from the address you used
        to order, and we will respond within 30 days. If you are in the EU or UK, you also have the
        right to complain to your national data protection authority.
      </p>
      <p>
        Deleting your order record means we can no longer honour the guarantee or re-send your
        credentials, since the order is what links them to you.
      </p>

      <h2>Cookies</h2>
      <p>
        We use one cookie, set only after you enter an access code, so that your order history stays
        visible for 30 minutes. It is strictly necessary and carries no advertising identifier. The
        site sets no third-party or advertising cookies.
      </p>
    </LegalPage>
  );
}
