import { NextRequest, NextResponse } from 'next/server';
import { getCredentialsForToken } from '@/lib/delivery';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JSZip = require('jszip');

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

    const result = await getCredentialsForToken(token);

    if (!result.success) {
      return new NextResponse(result.error || 'Download failed', {
        status: result.error?.includes('expired') ? 410 : 400,
      });
    }

    const zip = new JSZip();

    for (let i = 0; i < result.credentials!.length; i++) {
      const cred = result.credentials![i];
      const folder = result.credentials!.length > 1 ? zip.folder(`account-${i + 1}`)! : zip;

      // Data.txt — full credentials
      const dataTxt = buildDataTxt(cred);
      folder.file('Data.txt', dataTxt);

      // Cookies.json — importable by Dolphin
      if (cred.cookies) {
        try {
          const cookiesArr = JSON.parse(cred.cookies);
          folder.file('Cookies.json', JSON.stringify(cookiesArr, null, 2));
        } catch {
          folder.file('Cookies.json', cred.cookies);
        }
      }

      // Binary files (identity docs, user-agent screenshots)
      if (cred.files) {
        try {
          const files: Array<{ name: string; mime: string; data: string }> = JSON.parse(cred.files);
          const docsFolder = folder.folder('Docs')!;
          for (const f of files) {
            if (f.name.toLowerCase().includes('useragent') || f.name.toLowerCase().includes('user_agent')) {
              folder.file(f.name, Buffer.from(f.data, 'base64'));
            } else {
              docsFolder.file(f.name, Buffer.from(f.data, 'base64'));
            }
          }
        } catch {
          // Silently ignore malformed files JSON
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="gadscale-${result.orderId}.zip"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Download ZIP error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

function buildDataTxt(cred: {
  email: string;
  password: string;
  totp_secret?: string | null;
  recovery_email?: string | null;
  recovery_password?: string | null;
  proxy?: string | null;
  backup_codes?: string | null;
  seed_phrase?: string | null;
  phone_number?: string | null;
  user_agent?: string | null;
}): string {
  const lines: string[] = [];

  lines.push(`Gmail:`);
  lines.push(cred.email);
  lines.push(cred.password);
  lines.push('');

  if (cred.totp_secret) {
    lines.push(`2FA Secret:`);
    lines.push(cred.totp_secret);
    lines.push('');
  }

  if (cred.backup_codes) {
    lines.push(`Backup Codes:`);
    const codes = cred.backup_codes.split(',').map((c) => c.trim()).filter(Boolean);
    codes.forEach((code, i) => lines.push(`${i + 1}. ${code}`));
    lines.push('');
  }

  if (cred.seed_phrase) {
    lines.push(`Recovery Seed:`);
    lines.push(cred.seed_phrase);
    lines.push('');
  }

  if (cred.recovery_email) {
    lines.push(`Recovery Email:`);
    lines.push(cred.recovery_email);
    if (cred.recovery_password) {
      lines.push(cred.recovery_password);
    }
    lines.push('');
  }

  if (cred.phone_number) {
    lines.push(`Phone / Activation:`);
    lines.push(cred.phone_number);
    lines.push('');
  }

  if (cred.proxy) {
    lines.push(`Proxy:`);
    lines.push(cred.proxy);
    lines.push('');
  }

  if (cred.user_agent) {
    lines.push(`User-Agent:`);
    lines.push(cred.user_agent);
    lines.push('');
  }

  lines.push('');
  lines.push(`FULL GUIDE: ${APP_URL}/guide`);
  lines.push('SUPPORT: Telegram @googleads_now or gadscale@gmail.com');

  return lines.join('\n');
}
