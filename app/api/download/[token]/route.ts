import { NextRequest, NextResponse } from 'next/server';
import { getCredentialsForToken } from '@/lib/delivery';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.gadscale.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return new NextResponse('Invalid download link', { status: 400 });
    }

    // Get credentials for this token
    const result = await getCredentialsForToken(token);

    if (!result.success) {
      return new NextResponse(result.error || 'Download failed', {
        status: result.error?.includes('expired') ? 410 : 400,
      });
    }

    // Generate .txt file content
    const content = generateCredentialsTxt(
      result.credentials!,
      result.orderId!,
      result.productName!
    );

    // Return as downloadable .txt file
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="gadscale-credentials-${result.orderId}.txt"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * Generate formatted .txt file content
 */
function generateCredentialsTxt(
  credentials: Array<{
    email: string;
    password: string;
    totp_secret?: string | null;
    recovery_email?: string | null;
    proxy?: string | null;
  }>,
  orderId: string,
  productName: string
): string {
  const now = new Date().toISOString();

  let content = `╔═══════════════════════════════════════════════════════════════════════╗
║                          GADSCALE                                      ║
║                  Google Ads Threshold Accounts                        ║
╚═══════════════════════════════════════════════════════════════════════╝

ORDER ID: ${orderId}
PRODUCT: ${productName}
DELIVERED: ${now}
QUANTITY: ${credentials.length}

═══════════════════════════════════════════════════════════════════════

`;

  credentials.forEach((cred, index) => {
    content += `ACCOUNT ${index + 1}:
───────────────────────────────────────────────────────────────────────
Email:    ${cred.email}
Password: ${cred.password}
`;
    if (cred.totp_secret) {
      content += `2FA Secret: ${cred.totp_secret}\n`;
    }
    if (cred.recovery_email) {
      content += `Recovery Email: ${cred.recovery_email}\n`;
    }
    if (cred.proxy) {
      content += `Proxy: ${cred.proxy}\n`;
    }
    content += `\n`;
  });

  content += `═══════════════════════════════════════════════════════════════════════

FULL GUIDE: ${APP_URL}/guide

1. SECURITY
   • Store this file in a secure location (password manager, encrypted drive)
   • Do NOT share these credentials with anyone
   • Delete this file after saving credentials elsewhere

2. PROXY (if a Proxy line appears above)
   • Configure it BEFORE your first login, and keep using it
   • Format is ip:port:username:password

3. LOGIN
   • Go to ads.google.com, in a fresh browser profile
   • Use the email and password provided above
   • The 2FA Secret is a setup key: paste it into an authenticator app
     ("enter setup key manually"), which then generates the 6-digit code

4. MAKE IT YOURS — do this on day one
   • Change the password
   • Replace the recovery email with one you control
   • Re-generate 2FA against your own authenticator

5. THRESHOLD
   • This account has a billing threshold unlocked
   • You can spend up to the threshold before Google charges you
   • It is a billing trigger, not a spending cap - monitor your spend

6. 24-HOUR GUARANTEE
   • Covers: credentials that don't work, an already-suspended account,
     a threshold that isn't unlocked, an account not as described
   • Not covered: suspensions caused by your own campaigns
   • Claim from ${APP_URL}/account - Order ID: ${orderId}

7. SUPPORT
   • Telegram: @googleads_now
   • Email: gadscale@gmail.com with your Order ID
   • Response time: Usually within 1-2 hours

═══════════════════════════════════════════════════════════════════════

© 2026 GADSCALE - Threshold accounts delivered instantly
This file was generated automatically. Keep it confidential.

═══════════════════════════════════════════════════════════════════════
`;

  return content;
}
