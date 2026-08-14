import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Getting Started — GADSCALE',
  description:
    'What to do with your credentials file: first login, 2FA, securing the account, and how threshold billing works.',
};

export default function GuidePage() {
  return (
    <LegalPage title="Getting started" updated="14 August 2026">
      <p>
        Your credentials file contains everything needed to take control of the account. Work
        through these steps in order — the first two matter most, and the whole thing takes about
        ten minutes.
      </p>

      <h2>1. Save the file somewhere safe</h2>
      <p>
        The download link expires 24 hours after delivery and works three times. Move the contents
        into a password manager now, then delete the <code>.txt</code>. If the link lapses before
        you do, ask us on Telegram and we will issue a new one — the account is yours either way.
      </p>

      <h2>2. Set up the proxy before logging in</h2>
      <p>
        If your file has a <strong>Proxy</strong> line, configure it in your browser or anti-detect
        profile <em>before</em> the first login, and keep using it afterwards. The format is{' '}
        <code>ip:port:username:password</code>.
      </p>
      <p>
        Google Ads treats a sudden change of location on an established account as a risk signal.
        Signing in from a consistent connection avoids a verification challenge that can lock you
        out of an account you have just paid for. If no proxy line is present, no proxy is needed.
      </p>

      <h2>3. First login</h2>
      <p>
        Go to <a href="https://ads.google.com">ads.google.com</a> and sign in with the{' '}
        <strong>Email</strong> and <strong>Password</strong> from the file. Use a fresh browser
        profile, not one already signed in to another Google account.
      </p>

      <h2>4. Two-factor authentication</h2>
      <p>
        The <strong>2FA Secret</strong> line is not a code — it is the seed that generates codes. It
        goes into an authenticator app: in Google Authenticator, Authy or 1Password, choose
        &quot;enter setup key manually&quot; and paste it. The app then produces the six-digit code
        Google asks for, refreshed every 30 seconds.
      </p>
      <p>
        The <strong>Recovery Email</strong> line is the address Google falls back to if it wants to
        verify you another way.
      </p>

      <h2>5. Make the account yours</h2>
      <p>
        Do this on day one. Until you do, the delivery credentials are the account&apos;s
        credentials, and we cannot be responsible for an account left on them.
      </p>
      <ul>
        <li>Change the password.</li>
        <li>Replace the recovery email with one you control.</li>
        <li>Re-generate 2FA against your own authenticator.</li>
        <li>Check the billing section shows the threshold described on the product page.</li>
      </ul>

      <h2>6. How threshold billing works</h2>
      <p>
        Google normally bills you upfront. On a threshold account it does the opposite: you run ads,
        spend accumulates, and Google only charges the payment method once the spend reaches the
        threshold. A €50 threshold means roughly €50 of advertising before the first charge.
      </p>
      <p>
        The threshold typically rises as the account builds a payment history. Watch your spend in
        the Google Ads billing dashboard — the threshold is a billing trigger, not a spending cap,
        and it does not limit how fast a campaign can burn budget.
      </p>

      <h2>7. Your 24-hour guarantee</h2>
      <p>
        Every account is covered for <strong>24 hours from delivery</strong>. That window exists for
        the faults visible on your very first login, which is why step 3 should not wait.
      </p>
      <p>
        <strong>Covered:</strong> the credentials do not work, the account is already suspended, the
        threshold is not unlocked as described, or the account does not match what you paid for.
      </p>
      <p>
        <strong>Not covered:</strong> a suspension caused by your own campaigns. Policy-violating
        creatives, prohibited products and abrupt budget jumps get accounts banned, and that is the
        campaign rather than the account. The same goes for anything after the 24 hours have
        elapsed. Full terms on the <a href="/refunds">guarantee page</a>.
      </p>
      <p>
        To claim, open <a href="/account">your orders</a>, enter the code we email you, and use
        &quot;Report a problem&quot; on the order. It reaches us immediately.
      </p>

      <h2>8. Getting help</h2>
      <p>
        For the two most common needs — checking an order and getting a new download link — our bot{' '}
        <a href="https://t.me/gads_scale_bot" target="_blank" rel="noopener noreferrer">
          @gads_scale_bot
        </a>{' '}
        answers instantly, at any hour. Send it <code>/order &lt;your order id&gt;</code> or{' '}
        <code>/resend &lt;your order id&gt;</code>. A re-sent link always goes to the address on the
        order, never to whoever asked.
      </p>
      <p>
        For anything else, a human answers at{' '}
        <a href="https://t.me/googleads_now" target="_blank" rel="noopener noreferrer">
          @googleads_now
        </a>{' '}
        — have your order ID ready, it is at the top of your credentials file. You can also write to{' '}
        <a href="mailto:gadscale@gmail.com">gadscale@gmail.com</a>.
      </p>
    </LegalPage>
  );
}
