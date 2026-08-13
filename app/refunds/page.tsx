import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Refunds & Guarantee — GADSCALE',
  description:
    'Our 24-hour replacement guarantee, what it covers, and how refunds work on crypto payments.',
};

export default function RefundsPage() {
  return (
    <LegalPage title="Refunds & Guarantee" updated="14 August 2026">
      <p>
        Short version: <strong>every account is guaranteed for 24 hours after delivery.</strong> If
        it does not work, you get another one. Because payments are made in cryptocurrency, we
        replace rather than refund.
      </p>

      <h2>The 24-hour replacement guarantee</h2>
      <p>
        The clock starts the moment your credentials are delivered. Within that window, we replace
        the account free of charge if:
      </p>
      <ul>
        <li>the credentials do not work and you cannot log in;</li>
        <li>the account is already suspended when you receive it;</li>
        <li>the billing threshold is not unlocked as described on the product page;</li>
        <li>the account does not match the description you paid for.</li>
      </ul>
      <p>
        Twenty-four hours is deliberately short, and it is the window in which these problems show
        up: they are all visible on your very first login. Check the account as soon as you receive
        it.
      </p>

      <h2>What the guarantee does not cover</h2>
      <ul>
        <li>
          <strong>Suspensions caused by your own activity.</strong> Policy-violating creatives,
          prohibited products, aggressive budget jumps — these get accounts banned, and that is on
          the campaigns, not on the account we sold.
        </li>
        <li>
          <strong>Anything after the 24-hour window.</strong> Once you have been running ads, we
          cannot distinguish an account problem from a campaign problem.
        </li>
        <li>
          <strong>Losing the credentials.</strong> If you lose the file we will re-send it, but the
          account itself is not replaced.
        </li>
        <li>
          <strong>Accounts you have shared or resold.</strong> The guarantee covers one buyer.
        </li>
      </ul>

      <h2>How to claim</h2>
      <p>
        Message us on Telegram at{' '}
        <a href="https://t.me/googleads_now" target="_blank" rel="noopener noreferrer">
          @googleads_now
        </a>{' '}
        with your order ID and a screenshot of the problem. We aim to reply within a few hours and
        to send a replacement the same day, subject to stock.
      </p>
      <p>
        If the product is out of stock when you claim, we will either wait for the next restock with
        your agreement, or issue a refund as described below.
      </p>

      <h2>Refunds</h2>
      <p>
        Cryptocurrency transactions are irreversible: we cannot reverse a payment once it is
        confirmed, and neither can you. That is why the guarantee is a replacement guarantee.
      </p>
      <p>
        Where a replacement is impossible — a valid claim with no stock and no restock you are
        willing to wait for — we will refund the amount you paid, in the same cryptocurrency, to an
        address you provide. The refund is calculated on the US dollar price you paid, converted at
        the rate on the day of the refund. Network fees are deducted from the amount sent.
      </p>
      <p>
        We do not refund a change of mind, an unused account, or an account suspended through your
        own use.
      </p>

      <h2>Orders that never completed</h2>
      <p>
        If you started a checkout and never sent the funds, nothing is owed and nothing is charged —
        the order simply expires and the account returns to stock. If you sent the wrong amount, or
        sent after the payment window closed, contact support: we will resolve it case by case.
      </p>

      <h2>Legal information</h2>
      <p>
        GADSCALE is operated by <span className="todo">TODO: legal entity name</span>, registered in{' '}
        <span className="todo">TODO: country</span>. Statutory consumer rights that apply in your
        jurisdiction are not affected by this policy. Note that in many jurisdictions the right of
        withdrawal does not apply to digital content delivered immediately with the buyer&apos;s
        consent.
      </p>
    </LegalPage>
  );
}
