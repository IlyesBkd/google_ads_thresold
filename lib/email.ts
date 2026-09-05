import { getErrorMessage } from './errors';
/**
 * Email service using Resend
 */

import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || '';
    _resend = new Resend(key);
  }
  return _resend;
}

// Customers reply to delivery and guarantee emails, so the sender is a
// mailbox that is actually read rather than a no-reply black hole.
const FROM_EMAIL =
  process.env.RESEND_FROM || process.env.EMAIL_FROM || 'GADSCALE <support@gadscale.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Send credentials delivery email to customer
 */
export async function sendCredentialsEmail(
  customerEmail: string,
  orderId: string,
  productName: string,
  downloadToken: string,
  expiresAt: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const downloadUrl = `${APP_URL}/download/${downloadToken}`;
    const expiresIn = Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Your ${productName} is ready - Order ${orderId}`,
      html: getCredentialsEmailHtml({
        orderId,
        productName,
        downloadUrl,
        expiresIn,
      }),
      text: getCredentialsEmailText({
        orderId,
        productName,
        downloadUrl,
        expiresIn,
      }),
    });

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Nudge a buyer whose checkout expired without payment.
 *
 * Only ever sent once per order, and only when the product is back in stock —
 * a reminder for something they still cannot buy is just noise.
 */
export async function sendAbandonedCheckoutEmail(
  customerEmail: string,
  productName: string,
  priceLabel: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Still want that ${productName}?`,
      html: getAbandonedEmailHtml(productName, priceLabel),
      text: [
        `You started an order for a ${productName} but the payment never arrived,`,
        `so the account went back into stock.`,
        ``,
        `It's available again at ${priceLabel}: ${APP_URL}`,
        ``,
        `Questions? Reply on Telegram — we answer fast.`,
      ].join('\n'),
    });

    return { success: true };
  } catch (error) {
    console.error('Abandoned checkout email error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

function getAbandonedEmailHtml(productName: string, priceLabel: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Still interested?</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #080808; color: #FAFAFA;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <div style="text-align: center; margin-bottom: 34px;">
      <span style="font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: #F5F5F5;">GADSCALE</span>
    </div>

    <div style="background: #0C0C0C; border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 32px;">
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; color: #FAFAFA;">
        Still want it?
      </h1>
      <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.6; color: #9A9A9A;">
        You started an order for a <strong style="color: #FAFAFA;">${productName}</strong> but the
        payment never came through, so the account went back into stock.
      </p>
      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #9A9A9A;">
        It's available again at <strong style="color: #FAFAFA;">${priceLabel}</strong>, with the
        billing threshold already unlocked and a 24-hour replacement guarantee.
      </p>

      <a href="${APP_URL}" style="display: block; width: 100%; padding: 16px; background: #4285F4; color: #fff; text-align: center; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">
        Finish your order
      </a>
    </div>

    <p style="margin: 24px 0 0; font-size: 12.5px; line-height: 1.6; color: #6A6A6A; text-align: center;">
      This is the only reminder we'll send for this order.
    </p>

  </div>
</body>
</html>
  `.trim();
}

/**
 * Send the one-time code that unlocks a buyer's order history.
 */
export async function sendAccessCodeEmail(
  customerEmail: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `${code} is your GADSCALE access code`,
      html: getAccessCodeEmailHtml(code),
      text: [
        `Your GADSCALE access code is ${code}`,
        ``,
        `Enter it at ${APP_URL}/account to see your orders.`,
        `The code expires in 10 minutes.`,
        ``,
        `If you didn't request this, ignore this email — nothing was shared.`,
      ].join('\n'),
    });

    return { success: true };
  } catch (error) {
    console.error('Access code email error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

function getAccessCodeEmailHtml(code: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your access code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #080808; color: #FAFAFA;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <div style="text-align: center; margin-bottom: 36px;">
      <span style="font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: #F5F5F5;">GADSCALE</span>
      <h1 style="margin: 16px 0 0; font-size: 26px; font-weight: 600; letter-spacing: -0.03em; color: #FAFAFA;">Your access code</h1>
    </div>

    <div style="background: #0C0C0C; border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 32px; text-align: center;">
      <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.6; color: #9A9A9A;">
        Enter this code to see your orders and download your credentials.
      </p>

      <div style="font-family: 'Courier New', monospace; font-size: 38px; font-weight: 700; letter-spacing: 0.22em; color: #4285F4; padding: 18px 0;">
        ${code}
      </div>

      <p style="margin: 18px 0 0; font-size: 13px; color: #8A8A8A;">
        Expires in <strong style="color: #FBBC04;">10 minutes</strong>.
      </p>
    </div>

    <p style="margin: 26px 0 0; font-size: 13px; line-height: 1.6; color: #6A6A6A; text-align: center;">
      Didn't request this? Ignore this email — nothing was shared and no one can
      reach your orders without the code.
    </p>

  </div>
</body>
</html>
  `.trim();
}

/**
 * HTML email template for credentials delivery
 */
function getCredentialsEmailHtml({
  orderId,
  productName,
  downloadUrl,
  expiresIn,
}: {
  orderId: string;
  productName: string;
  downloadUrl: string;
  expiresIn: number;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Google Ads Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #080808; color: #FAFAFA;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="display: inline-flex; align-items: center; gap: 10px; margin-bottom: 16px;">
        <span style="display: inline-flex; align-items: flex-end; gap: 3px; height: 32px; padding: 6px; background: #101010; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
          <i style="display: inline-block; width: 4px; height: 8px; border-radius: 2px; background: #4285F4;"></i>
          <i style="display: inline-block; width: 4px; height: 13px; border-radius: 2px; background: #4285F4;"></i>
          <i style="display: inline-block; width: 4px; height: 18px; border-radius: 2px; background: #FBBC04;"></i>
        </span>
        <span style="font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: #F5F5F5;">GADSCALE</span>
      </div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.03em; color: #FAFAFA;">Your account is ready</h1>
    </div>

    <!-- Main content -->
    <div style="background: #0C0C0C; border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 32px; margin-bottom: 24px;">
      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #9A9A9A;">
        Your <strong style="color: #FAFAFA;">${productName}</strong> has been delivered and is ready to use.
      </p>

      <div style="background: rgba(66,133,244,0.08); border: 1px solid rgba(66,133,244,0.2); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-family: 'Courier New', monospace; letter-spacing: 0.5px; color: #4285F4; text-transform: uppercase; margin-bottom: 8px;">Order ID</div>
        <div style="font-size: 16px; font-family: 'Courier New', monospace; color: #FAFAFA;">${orderId}</div>
      </div>

      <a href="${downloadUrl}" style="display: block; width: 100%; padding: 16px; background: #4285F4; color: #fff; text-align: center; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; margin-bottom: 16px;">
        Download Credentials (.txt)
      </a>

      <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: rgba(251,188,4,0.08); border: 1px solid rgba(251,188,4,0.2); border-radius: 10px;">
        <span style="font-size: 20px;">⏱️</span>
        <span style="font-size: 13px; color: #E8D9A8;">
          Download link expires in <strong style="color: #FBBC04;">${expiresIn} hours</strong>. Save the file to a secure location.
        </span>
      </div>
    </div>

    <!-- What's inside -->
    <div style="margin-bottom: 32px;">
      <a href="${APP_URL}/guide" style="display: block; padding: 14px 16px; margin-bottom: 26px; background: rgba(66,133,244,0.07); border: 1px solid rgba(66,133,244,0.22); border-radius: 12px; text-decoration: none;">
        <span style="display: block; font-size: 14px; font-weight: 600; color: #4285F4; margin-bottom: 4px;">First time with a threshold account?</span>
        <span style="display: block; font-size: 13px; color: #9A9A9A; line-height: 1.5;">
          Read the 10-minute setup guide — proxy, first login, 2FA, and securing the account.
        </span>
      </a>

      <h2 style="font-size: 16px; font-weight: 600; color: #FAFAFA; margin: 0 0 16px;">What's inside the file:</h2>
      <ul style="margin: 0; padding: 0; list-style: none;">
        <li style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; font-size: 14px; color: #9A9A9A;">
          <span style="color: #4285F4;">✓</span> Google Ads account email
        </li>
        <li style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; font-size: 14px; color: #9A9A9A;">
          <span style="color: #4285F4;">✓</span> Account password
        </li>
        <li style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; font-size: 14px; color: #9A9A9A;">
          <span style="color: #4285F4;">✓</span> Recovery email (if applicable)
        </li>
        <li style="display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #9A9A9A;">
          <span style="color: #4285F4;">✓</span> Setup instructions
        </li>
      </ul>
    </div>

    <!-- Support -->
    <div style="padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; margin-bottom: 32px;">
      <div style="font-size: 14px; font-weight: 600; color: #FAFAFA; margin-bottom: 8px;">Need help?</div>
      <div style="font-size: 13px; color: #9A9A9A; line-height: 1.5;">
        If you have any questions or the download link doesn't work, contact us on Telegram (@googleads_now) or reply to this email with your order ID.
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06);">
      <p style="margin: 0 0 8px; font-size: 12px; color: #6A6A6A;">
        © 2026 GADSCALE · Threshold accounts delivered instantly
      </p>
      <p style="margin: 0; font-size: 12px; color: #6A6A6A;">
        This is an automated email. Do not reply to this address.
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Plain text email template for credentials delivery
 */
function getCredentialsEmailText({
  orderId,
  productName,
  downloadUrl,
  expiresIn,
}: {
  orderId: string;
  productName: string;
  downloadUrl: string;
  expiresIn: number;
}) {
  return `
GADSCALE - Your account is ready

Your ${productName} has been delivered and is ready to use.

ORDER ID: ${orderId}

DOWNLOAD YOUR CREDENTIALS:
${downloadUrl}

⏱️ Important: Download link expires in ${expiresIn} hours. Save the file to a secure location.

📖 Setup guide (proxy, first login, 2FA, securing the account):
${APP_URL}/guide

WHAT'S INSIDE THE FILE:
✓ Google Ads account email
✓ Account password
✓ Recovery email (if applicable)
✓ Setup instructions

NEED HELP?
If you have any questions or the download link doesn't work, contact us on Telegram (@googleads_now) or reply to this email with your order ID.

---
© 2026 GADSCALE · Threshold accounts delivered instantly
This is an automated email. Do not reply to this address.
  `;
}

/**
 * Send a "back in stock" email to a waitlist subscriber
 */
export async function sendRestockEmail(
  customerEmail: string,
  productName: string,
  productUrl: string,
  price?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `${productName} is back in stock — GadScale`,
      html: getRestockEmailHtml({ productName, productUrl, price }),
      text: getRestockEmailText({ productName, productUrl, price }),
    });
    return { success: true };
  } catch (error) {
    console.error('Restock email send error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

function getRestockEmailHtml({
  productName,
  productUrl,
  price,
}: {
  productName: string;
  productUrl: string;
  price?: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${productName} is back in stock</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #080808; color: #FAFAFA;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <div style="text-align: center; margin-bottom: 36px;">
      <span style="font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: #F5F5F5;">GADSCALE</span>
    </div>

    <div style="background: #0C0C0C; border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 32px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 12px;">🔔</div>
      <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; color: #FAFAFA;">Back in stock</h1>
      <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #9A9A9A;">
        Good news — the <strong style="color: #FAFAFA;">${productName}</strong> you were waiting for is available again. Stock is limited and sells fast.
      </p>
      ${price ? `<div style="font-size: 30px; font-weight: 700; color: #FAFAFA; margin-bottom: 24px;">${price}</div>` : ''}
      <a href="${productUrl}" style="display: inline-block; padding: 14px 28px; background: #4285F4; color: #fff; border-radius: 11px; font-size: 15px; font-weight: 600; text-decoration: none;">
        Buy now${price ? ` — ${price}` : ''}
      </a>
    </div>

    <div style="text-align: center; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06);">
      <p style="margin: 0 0 8px; font-size: 12px; color: #6A6A6A;">
        You're receiving this because you joined the restock waitlist on GadScale.
      </p>
      <p style="margin: 0; font-size: 12px; color: #6A6A6A;">
        © 2026 GADSCALE · Threshold accounts delivered instantly
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

function getRestockEmailText({
  productName,
  productUrl,
  price,
}: {
  productName: string;
  productUrl: string;
  price?: string;
}) {
  return `
GADSCALE — Back in stock

Good news — the ${productName} you were waiting for is available again.
Stock is limited and sells fast.
${price ? `\nPrice: ${price}\n` : ''}
Buy now: ${productUrl}

---
You're receiving this because you joined the restock waitlist on GadScale.
© 2026 GADSCALE · Threshold accounts delivered instantly
  `;
}
