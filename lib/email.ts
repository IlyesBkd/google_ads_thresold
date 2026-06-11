/**
 * Email service using Resend
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.EMAIL_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@adscale.io';
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

    await resend.emails.send({
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
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
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
        <span style="font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: #F5F5F5;">ADSCALE</span>
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
        If you have any questions or the download link doesn't work, contact us on Discord or reply to this email with your order ID.
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.06);">
      <p style="margin: 0 0 8px; font-size: 12px; color: #6A6A6A;">
        © 2026 ADSCALE · Threshold accounts delivered instantly
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
ADSCALE - Your account is ready

Your ${productName} has been delivered and is ready to use.

ORDER ID: ${orderId}

DOWNLOAD YOUR CREDENTIALS:
${downloadUrl}

⏱️ Important: Download link expires in ${expiresIn} hours. Save the file to a secure location.

WHAT'S INSIDE THE FILE:
✓ Google Ads account email
✓ Account password
✓ Recovery email (if applicable)
✓ Setup instructions

NEED HELP?
If you have any questions or the download link doesn't work, contact us on Discord or reply to this email with your order ID.

---
© 2026 ADSCALE · Threshold accounts delivered instantly
This is an automated email. Do not reply to this address.
  `;
}
