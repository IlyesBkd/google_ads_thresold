import { NextRequest, NextResponse } from 'next/server';
import { getCredentialsForToken } from '@/lib/delivery';

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
        'Content-Disposition': `attachment; filename="adscale-credentials-${result.orderId}.txt"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * Generate formatted .txt file content
 */
function generateCredentialsTxt(
  credentials: Array<{ email: string; password: string }>,
  orderId: string,
  productName: string
): string {
  const now = new Date().toISOString();

  let content = `╔═══════════════════════════════════════════════════════════════════════╗
║                          ADSCALE                                      ║
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
  });

  content += `═══════════════════════════════════════════════════════════════════════

IMPORTANT INSTRUCTIONS:

1. SECURITY
   • Store this file in a secure location (password manager, encrypted drive)
   • Do NOT share these credentials with anyone
   • Delete this file after saving credentials elsewhere

2. LOGIN
   • Go to ads.google.com
   • Use the email and password provided above
   • You may be asked for 2FA - check the recovery email if provided

3. THRESHOLD
   • This account has a billing threshold unlocked
   • You can spend up to the threshold before Google charges you
   • Monitor your spend in Google Ads dashboard

4. WARRANTY
   • If credentials don't work on first login, contact support immediately
   • Include your Order ID: ${orderId}
   • Replacement warranty valid for 24-48 hours (see product description)

5. SUPPORT
   • Discord: Join our server (link on website)
   • Email: Reply to the delivery email with your Order ID
   • Response time: Usually within 1-2 hours

═══════════════════════════════════════════════════════════════════════

© 2026 ADSCALE - Threshold accounts delivered instantly
This file was generated automatically. Keep it confidential.

═══════════════════════════════════════════════════════════════════════
`;

  return content;
}
